package gdelt

import (
	"context"
	"fmt"
	"time"

	connect "connectrpc.com/connect"
	gdeltv1 "imply/server/gen/gdelt/v1"
	gdeltclient "github.com/tri2820/gdelt"
)

// Service implements the GdeltService
type Service struct {
	client *gdeltclient.Client
}

// NewService creates a new GdeltService
func NewService() *Service {
	return &Service{
		client: gdeltclient.NewClient(),
	}
}

// parseDate parses a date string in YYYY-MM-DD format
func parseDate(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// SearchArticles searches for articles matching the query
func (s *Service) SearchArticles(ctx context.Context, req *connect.Request[gdeltv1.SearchArticlesRequest]) (*connect.Response[gdeltv1.SearchArticlesResponse], error) {
	// Build filters from request
	filters := &gdeltclient.Filters{
		Keyword: req.Msg.Query,
	}

	if req.Msg.Timespan != "" {
		filters.Timespan = req.Msg.Timespan
	}

	if req.Msg.StartDate != "" {
		startDate, err := parseDate(req.Msg.StartDate)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid start_date format: %w", err))
		}
		filters.StartDate = startDate
	}

	if req.Msg.EndDate != "" {
		endDate, err := parseDate(req.Msg.EndDate)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid end_date format: %w", err))
		}
		filters.EndDate = endDate
	}

	if req.Msg.MaxRecords > 0 {
		filters.NumRecords = int(req.Msg.MaxRecords)
	} else {
		filters.NumRecords = 50 // default
	}

	// Search articles
	articles, err := s.client.ArticleSearch(filters)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to search articles: %w", err))
	}

	// Convert to proto response
	protoArticles := make([]*gdeltv1.Article, len(articles))
	for i, a := range articles {
		protoArticles[i] = &gdeltv1.Article{
			Url:      a.URL,
			Title:    a.Title,
			Domain:   a.Domain,
			Language: a.Language,
			Seendate: a.SeenDate,
		}
	}

	return connect.NewResponse(&gdeltv1.SearchArticlesResponse{
		Articles: protoArticles,
	}), nil
}

// GetTimeline retrieves timeline data for the query
func (s *Service) GetTimeline(ctx context.Context, req *connect.Request[gdeltv1.GetTimelineRequest]) (*connect.Response[gdeltv1.GetTimelineResponse], error) {
	mode := req.Msg.Mode
	if mode == "" {
		mode = gdeltclient.ModeTimelineVol
	}

	// Build filters from request
	filters := &gdeltclient.Filters{
		Keyword: req.Msg.Query,
	}

	if req.Msg.Timespan != "" {
		filters.Timespan = req.Msg.Timespan
	}

	if req.Msg.StartDate != "" {
		startDate, err := parseDate(req.Msg.StartDate)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid start_date format: %w", err))
		}
		filters.StartDate = startDate
	}

	if req.Msg.EndDate != "" {
		endDate, err := parseDate(req.Msg.EndDate)
		if err != nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid end_date format: %w", err))
		}
		filters.EndDate = endDate
	}

	// Set default NumRecords for timeline
	filters.NumRecords = 250

	// Get timeline data
	result, err := s.client.TimelineSearch(mode, filters)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get timeline: %w", err))
	}

	// Convert to proto response - for now use first series
	points := make([]*gdeltv1.TimelinePoint, len(result.Rows))
	for i, row := range result.Rows {
		// Get value from first series if available
		var value float64
		if len(result.SeriesNames) > 0 {
			seriesName := result.SeriesNames[0]
			value = row.Series[seriesName]
		}

		points[i] = &gdeltv1.TimelinePoint{
			Date:  row.DateTime.Format("2006-01-02T15:04:05Z"),
			Value: value,
		}
	}

	return connect.NewResponse(&gdeltv1.GetTimelineResponse{
		Points: points,
	}), nil
}
