package gdelt

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// API Base URL
	baseURL = "https://api.gdeltproject.org/api/v2/doc/doc"
	// Version
	version = "1.0.0"
	// User agent
	userAgent = "GDELT Go API client " + version + " - https://github.com/tri/gdelt"
)

// Client is the GDELT API client
type Client struct {
	httpClient     *http.Client
	jsonParseDepth int
}

// NewClient creates a new GDELT API client
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		jsonParseDepth: 100,
	}
}

// NewClientWithHTTP creates a new GDELT API client with a custom HTTP client
func NewClientWithHTTP(client *http.Client) *Client {
	return &Client{
		httpClient:     client,
		jsonParseDepth: 100,
	}
}

// SetJSONParseDepth sets the maximum depth for JSON parsing cleanup
func (c *Client) SetJSONParseDepth(depth int) {
	c.jsonParseDepth = depth
}

// API modes
const (
	ModeArtList            = "artlist"
	ModeTimelineVol        = "timelinevol"
	ModeTimelineVolRaw     = "timelinevolraw"
	ModeTimelineTone       = "timelinetone"
	ModeTimelineLang       = "timelinelang"
	ModeTimelineSourceCountry = "timelinesourcecountry"
)

// supportedModes validates API modes
var supportedModes = map[string]bool{
	ModeArtList:            true,
	ModeTimelineVol:        true,
	ModeTimelineVolRaw:     true,
	ModeTimelineTone:       true,
	ModeTimelineLang:       true,
	ModeTimelineSourceCountry: true,
}

// ArticleSearch performs an article list search
func (c *Client) ArticleSearch(filters *Filters) ([]Article, error) {
	result, err := c.query(ModeArtList, filters)
	if err != nil {
		return nil, err
	}

	articles, ok := result["articles"]
	if !ok {
		return []Article{}, nil
	}

	// Marshal and unmarshal to convert to Article struct
	data, err := json.Marshal(articles)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal articles: %w", err)
	}

	var articleList []Article
	if err := json.Unmarshal(data, &articleList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal articles: %w", err)
	}

	return articleList, nil
}

// TimelineSearch performs a timeline search in the specified mode
func (c *Client) TimelineSearch(mode string, filters *Filters) (*TimelineResult, error) {
	if !supportedModes[mode] {
		return nil, fmt.Errorf("mode %s is not supported", mode)
	}

	result, err := c.query(mode, filters)
	if err != nil {
		return nil, err
	}

	// Marshal and unmarshal to convert to TimelineResponse
	data, err := json.Marshal(result)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal timeline: %w", err)
	}

	var resp TimelineResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal timeline: %w", err)
	}

	// Check for empty results
	if len(resp.Timeline) == 0 || len(resp.Timeline[0].Data) == 0 {
		return &TimelineResult{
			QueryDetails: resp.QueryDetails,
			Rows:        []TimelineRow{},
			SeriesNames: []string{},
		}, nil
	}

	return c.processTimeline(mode, resp)
}

// processTimeline converts the timeline response to TimelineResult
func (c *Client) processTimeline(mode string, resp TimelineResponse) (*TimelineResult, error) {
	numPoints := len(resp.Timeline[0].Data)
	seriesNames := make([]string, len(resp.Timeline))

	for i, series := range resp.Timeline {
		seriesNames[i] = series.Series
	}

	rows := make([]TimelineRow, numPoints)

	for i := 0; i < numPoints; i++ {
		// Parse datetime
		dateStr := resp.Timeline[0].Data[i].Date
		dt, err := time.Parse("20060102T150405Z", dateStr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse date %s: %w", dateStr, err)
		}

		row := TimelineRow{
			DateTime: dt,
			Series:   make(map[string]float64),
		}

		for _, series := range resp.Timeline {
			if i < len(series.Data) {
				row.Series[series.Series] = series.Data[i].Value
			}
		}

		// For timelinevolraw, also include the "All Articles" norm value
		if mode == ModeTimelineVolRaw && len(resp.Timeline) > 0 {
			if i < len(resp.Timeline[0].Data) && resp.Timeline[0].Data[i].Norm != nil {
				row.AllArticles = resp.Timeline[0].Data[i].Norm
			}
		}

		rows[i] = row
	}

	return &TimelineResult{
		QueryDetails: resp.QueryDetails,
		Rows:        rows,
		SeriesNames: seriesNames,
	}, nil
}

// query performs a raw query to the API
func (c *Client) query(mode string, filters *Filters) (map[string]interface{}, error) {
	if !supportedModes[mode] {
		return nil, fmt.Errorf("unsupported mode: %s", mode)
	}

	queryString, err := filters.BuildQueryString()
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Build URL with proper URL encoding
	url := fmt.Sprintf("%s?query=%s&mode=%s&format=json", baseURL, url.PathEscape(queryString), mode)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for HTTP errors
	if err := checkResponseError(resp.StatusCode, body); err != nil {
		return nil, err
	}

	// Sometimes API returns text/html for invalid requests
	ct := resp.Header.Get("Content-Type")
	if strings.Contains(ct, "text/html") {
		return nil, fmt.Errorf("the query was not valid. The API error message was: %s", strings.TrimSpace(string(body)))
	}

	// Parse JSON with cleanup for illegal characters
	var result map[string]interface{}
	if err := c.parseJSON(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return result, nil
}

// parseJSON tries to parse JSON, removing illegal characters if needed
func (c *Client) parseJSON(data []byte, result interface{}) error {
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()

	err := decoder.Decode(result)
	if err == nil {
		return nil
	}

	// Try to fix common JSON issues by recursively cleaning
	var cleanErr error
	for depth := 0; depth < c.jsonParseDepth; depth++ {
		// Try to find and fix the issue
		cleaned := c.cleanJSON(string(data))
		if cleaned == string(data) {
			// No changes made, stop trying
			break
		}

		decoder = json.NewDecoder(bytes.NewReader([]byte(cleaned)))
		decoder.DisallowUnknownFields()
		err = decoder.Decode(result)
		if err == nil {
			return nil
		}
		cleanErr = err
		data = []byte(cleaned)
	}

	return cleanErr
}

// cleanJSON removes problematic characters from JSON
func (c *Client) cleanJSON(jsonStr string) string {
	// This is a simple cleaner that removes some common issues
	// For a more robust solution, you might need a more sophisticated approach
	result := strings.ReplaceAll(jsonStr, "\x00", "")
	result = strings.ReplaceAll(result, "\x01", "")
	result = strings.ReplaceAll(result, "\x02", "")
	result = strings.ReplaceAll(result, "\x03", "")
	result = strings.ReplaceAll(result, "\x04", "")
	result = strings.ReplaceAll(result, "\x05", "")
	result = strings.ReplaceAll(result, "\x06", "")
	result = strings.ReplaceAll(result, "\x07", "")
	result = strings.ReplaceAll(result, "\x08", "")
	result = strings.ReplaceAll(result, "\x0B", "")
	result = strings.ReplaceAll(result, "\x0C", "")
	result = strings.ReplaceAll(result, "\x0E", "")
	result = strings.ReplaceAll(result, "\x0F", "")
	result = strings.ReplaceAll(result, "\x10", "")
	result = strings.ReplaceAll(result, "\x11", "")
	result = strings.ReplaceAll(result, "\x12", "")
	result = strings.ReplaceAll(result, "\x13", "")
	result = strings.ReplaceAll(result, "\x14", "")
	result = strings.ReplaceAll(result, "\x15", "")
	result = strings.ReplaceAll(result, "\x16", "")
	result = strings.ReplaceAll(result, "\x17", "")
	result = strings.ReplaceAll(result, "\x18", "")
	result = strings.ReplaceAll(result, "\x19", "")
	result = strings.ReplaceAll(result, "\x1A", "")
	result = strings.ReplaceAll(result, "\x1B", "")
	result = strings.ReplaceAll(result, "\x1C", "")
	result = strings.ReplaceAll(result, "\x1D", "")
	result = strings.ReplaceAll(result, "\x1E", "")
	result = strings.ReplaceAll(result, "\x1F", "")
	return result
}

// checkResponseError converts HTTP status codes to appropriate errors
func checkResponseError(statusCode int, body []byte) error {
	switch statusCode {
	case 200:
		return nil
	case 400:
		return &BadRequestError{
			Message: "bad request",
			Body:    string(body),
		}
	case 404:
		return &NotFoundError{Message: "not found"}
	case 429:
		return &RateLimitError{Message: "rate limit exceeded"}
	default:
		if statusCode >= 400 && statusCode < 500 {
			return &ClientRequestError{
				StatusCode: statusCode,
				Message:    string(body),
			}
		}
		if statusCode >= 500 && statusCode < 600 {
			return &ServerError{
				StatusCode: statusCode,
				Message:    string(body),
			}
		}
		return &APIError{
			StatusCode: statusCode,
			Message:    string(body),
		}
	}
}
