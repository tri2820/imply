package gdelt

import (
	"strings"
	"testing"
	"time"
)

func TestFiltersBuildQueryString(t *testing.T) {
	tests := []struct {
		name     string
		filters  *Filters
		contains []string
		wantErr  bool
	}{
		{
			name: "simple keyword with timespan",
			filters: &Filters{
				Timespan:   "24h",
				Keyword:    "climate change",
				NumRecords: 10,
			},
			contains: []string{"\"climate change\"", "timespan=24h", "maxrecords=10"},
			wantErr:  false,
		},
		{
			name: "keyword with dates",
			filters: &Filters{
				Keyword:    "test",
				NumRecords: 50,
			},
			contains: []string{},
			wantErr:  true, // Must provide dates or timespan
		},
		{
			name: "keyword with valid dates",
			filters: func() *Filters {
				start, _ := time.Parse("2006-01-02", "2025-01-01")
				end, _ := time.Parse("2006-01-02", "2025-01-02")
				return &Filters{
					StartDate:  &start,
					EndDate:    &end,
					Keyword:    "economy",
					NumRecords: 100,
				}
			}(),
			contains: []string{"\"economy\"", "startdatetime=20250101000000", "enddatetime=20250102000000"},
			wantErr:  false,
		},
		{
			name: "num_records exceeds limit",
			filters: &Filters{
				Timespan:   "1h",
				Keyword:    "test",
				NumRecords: 300,
			},
			contains: []string{},
			wantErr:  true,
		},
		{
			name: "with domain filter",
			filters: &Filters{
				Timespan:   "24h",
				Keyword:    "technology",
				Domain:     "techcrunch.com",
				NumRecords: 10,
			},
			contains: []string{"domain:techcrunch.com"},
			wantErr:  false,
		},
		{
			name: "with country filter",
			filters: &Filters{
				Timespan:   "24h",
				Keyword:    "news",
				Country:    CountryUS,
				NumRecords: 10,
			},
			contains: []string{"sourcecountry:US"},
			wantErr:  false,
		},
		{
			name: "with language filter",
			filters: &Filters{
				Timespan:   "24h",
				Keyword:    "news",
				Language:   LangEnglish,
				NumRecords: 10,
			},
			contains: []string{"sourcelang:en"},
			wantErr:  false,
		},
		{
			name: "with tone filter",
			filters: &Filters{
				Timespan:   "24h",
				Keyword:    "economy",
				Tone:       string(ToneGreater) + "5",
				NumRecords: 10,
			},
			contains: []string{"tone>5"},
			wantErr:  false,
		},
		{
			name: "with near filter",
			filters: &Filters{
				Timespan:   "24h",
				Near:       Near(5, "climate", "technology"),
				NumRecords: 10,
			},
			contains: []string{"near5:\"climate technology\""},
			wantErr:  false,
		},
		{
			name: "with repeat filter",
			filters: &Filters{
				Timespan:   "24h",
				Repeat:     Repeat(3, "energy"),
				NumRecords: 10,
			},
			contains: []string{"repeat3:\"energy\""},
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query, err := tt.filters.BuildQueryString()
			if (err != nil) != tt.wantErr {
				t.Errorf("BuildQueryString() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				for _, substr := range tt.contains {
					if !strings.Contains(query, substr) {
						t.Errorf("BuildQueryString() = %q, does not contain %q", query, substr)
					}
				}
			}
		})
	}
}

func TestValidateTimespan(t *testing.T) {
	tests := []struct {
		name     string
		timespan string
		wantErr  bool
	}{
		{"15min", "15min", true},   // Less than 60 minutes
		{"60min", "60min", false},
		{"2h", "2h", false},
		{"24hours", "24hours", false},
		{"7d", "7d", false},
		{"30days", "30days", false},
		{"2w", "2w", false},
		{"4weeks", "4weeks", false},
		{"3m", "3m", false},
		{"6months", "6months", false},
		{"invalid", "invalid", true},
		{"5x", "5x", true},  // Invalid unit
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTimespan(tt.timespan)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateTimespan() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTone(t *testing.T) {
	tests := []struct {
		name    string
		tone    string
		wantErr bool
	}{
		{"greater than positive", ">5", false},
		{"less than negative", "<-5", false},
		{"greater than with equal", ">=10", false},
		{"less than with equal", "<=-10", false},
		{"no operator", "5", true},
		{"has equals only", "=5", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTone(tt.tone)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateTone() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestNear(t *testing.T) {
	result := Near(5, "climate", "change")
	expected := "near5:\"climate change\" "
	if result != expected {
		t.Errorf("Near() = %q, want %q", result, expected)
	}
}

func TestMultiNear(t *testing.T) {
	result := MultiNear([]NearConfig{{5, []string{"airline", "crisis"}}, {10, []string{"airline", "climate"}}}, "AND")
	if !strings.Contains(result, "near5:") {
		t.Errorf("MultiNear() = %q, should contain near5:", result)
	}
	if !strings.Contains(result, "near10:") {
		t.Errorf("MultiNear() = %q, should contain near10:", result)
	}
}

func TestRepeat(t *testing.T) {
	result := Repeat(3, "energy")
	expected := "repeat3:\"energy\" "
	if result != expected {
		t.Errorf("Repeat() = %q, want %q", result, expected)
	}
}

func TestMultiRepeat(t *testing.T) {
	result := MultiRepeat([]RepeatConfig{{2, "airline"}, {3, "airport"}}, "AND")
	if !strings.Contains(result, "repeat2:") {
		t.Errorf("MultiRepeat() = %q, should contain repeat2:", result)
	}
	if !strings.Contains(result, "repeat3:") {
		t.Errorf("MultiRepeat() = %q, should contain repeat3:", result)
	}
}
