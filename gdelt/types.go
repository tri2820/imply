package gdelt

import "time"

// APIResponse is the base response from GDELT API
type APIResponse struct {
	Articles []Article `json:"articles,omitempty"`
}

// Article represents a single article from the ArtList API
type Article struct {
	URL           string `json:"url"`
	URLMobile     string `json:"url_mobile"`
	Title         string `json:"title"`
	SeenDate      string `json:"seendate"`
	SocialImage   string `json:"socialimage"`
	Domain        string `json:"domain"`
	Language      string `json:"language"`
	SourceCountry string `json:"sourcecountry"`
}

// GetSeenTime parses the seendate field into time.Time
func (a *Article) GetSeenTime() (time.Time, error) {
	return time.Parse("20060102T150405Z", a.SeenDate)
}

// TimelineResponse is the response from timeline modes
type TimelineResponse struct {
	QueryDetails QueryDetails `json:"query_details"`
	Timeline     []TimelineSeries `json:"timeline"`
}

// QueryDetails contains metadata about the timeline query
type QueryDetails struct {
	Title           string `json:"title"`
	DateResolution  string `json:"date_resolution"`
}

// TimelineSeries represents a single series in timeline data
type TimelineSeries struct {
	Series string        `json:"series"`
	Data   []TimelineData `json:"data"`
}

// TimelineData is a single data point in a timeline
type TimelineData struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
	Norm  *int    `json:"norm,omitempty"` // Only in timelinevolraw
}

// TimelineRow represents a single row of timeline data after processing
type TimelineRow struct {
	DateTime    time.Time
	Series      map[string]float64
	AllArticles *int // Only populated for timelinevolraw
}

// TimelineResult is the processed timeline data
type TimelineResult struct {
	QueryDetails QueryDetails
	Rows         []TimelineRow
	SeriesNames  []string
}
