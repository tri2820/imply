# GDELT 2.0 Doc API Client for Go

A Go client to fetch data from the [GDELT 2.0 Doc API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/).

This allows for simpler, small-scale analysis of news coverage without having to deal with the complexities of downloading and managing the raw files from S3, or working with the BigQuery export.

## Installation

```bash
go get github.com/tri/gdelt
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"
    "time"

    gdelt "github.com/tri/gdelt"
)

func main() {
    client := gdelt.NewClient()

    // Article search with keyword and timespan
    filters := &gdelt.Filters{
        Timespan:   "24h",
        Keyword:    "climate change",
        NumRecords: 10,
    }

    articles, err := client.ArticleSearch(filters)
    if err != nil {
        log.Fatal(err)
    }

    for _, article := range articles {
        fmt.Printf("%s: %s\n", article.Title, article.URL)
    }

    // Timeline search
    timeline, err := client.TimelineSearch(gdelt.ModeTimelineVol, filters)
    if err != nil {
        log.Fatal(err)
    }

    for _, row := range timeline.Rows {
        fmt.Printf("%s: %.2f\n", row.DateTime, row.Series["Volume Intensity"])
    }
}
```

## API Modes

The client supports all GDELT Doc API modes:

- `ModeArtList` - Returns a list of articles matching the filters
- `ModeTimelineVol` - Timeline of news coverage volume (percentage of total)
- `ModeTimelineVolRaw` - Timeline with actual article counts
- `ModeTimelineTone` - Timeline of average tone
- `ModeTimelineLang` - Timeline broken down by language
- `ModeTimelineSourceCountry` - Timeline broken down by country

## Filters

### Basic Filters

```go
filters := &gdelt.Filters{
    // Date range - use either StartDate/EndDate OR Timespan
    StartDate:  &startTime,  // time.Time
    EndDate:    &endTime,    // time.Time
    // OR
    Timespan:   "24h",       // 15min, 2h, 7d, 30days, 2w, 4weeks, 3m, 6months

    NumRecords: 250,         // Max 250 for article list

    // Content filters
    Keyword:    "climate change",
    Domain:     "nytimes.com",
    DomainExact: "bbc.co.uk",
    Country:    gdelt.CountryUS,  // FIPS 2-letter code
    Language:   gdelt.LangEnglish, // ISO 639 code
    Theme:      "ENV_CLIMATECHANGE",
}
```

### Tone Filters

Search for articles with specific tone characteristics:

```go
// Positive articles (tone > 5)
filters := &gdelt.Filters{
    Timespan: "24h",
    Keyword:  "economy",
    Tone:     string(gdelt.ToneGreater) + "5",
}

// Negative articles (tone < -5)
filters := &gdelt.Filters{
    Timespan: "24h",
    Keyword:  "crisis",
    Tone:     string(gdelt.ToneLess) + "-5",
}

// High emotion (ignoring positive/negative)
filters := &gdelt.Filters{
    Timespan: "24h",
    Keyword:  "protest",
    ToneAbs:  string(gdelt.ToneGreater) + "10",
}
```

### Proximity Filters (Near)

Find articles where words appear close to each other:

```go
// Find "climate" and "technology" within 5 words
filters := &gdelt.Filters{
    Timespan:   "7d",
    Near:       gdelt.Near(5, "climate", "technology"),
    NumRecords: 10,
}

// Multiple near conditions
filters := &gdelt.Filters{
    Timespan: "7d",
    Near: gdelt.MultiNear([]gdelt.NearConfig{
        {5, []string{"airline", "crisis"}},
        {10, []string{"airline", "climate", "change"}},
    }, "AND"),
    NumRecords: 10,
}
```

### Repetition Filters

Find articles with words repeated multiple times:

```go
// Articles with "energy" at least 3 times
filters := &gdelt.Filters{
    Timespan:   "24h",
    Repeat:     gdelt.Repeat(3, "energy"),
    NumRecords: 10,
}

// Multiple repeat conditions
filters := &gdelt.Filters{
    Timespan: "24h",
    Repeat: gdelt.MultiRepeat([]gdelt.RepeatConfig{
        {2, "airline"},
        {3, "airport"},
    }, "AND"),
    NumRecords: 10,
}
```

### OR Conditions

Multiple values for domain, country, language, etc. are combined with OR:

```go
filters := &gdelt.Filters{
    Timespan:  "24h",
    Keyword:   "technology",
    DomainOr:  []string{"techcrunch.com", "theverge.com", "arstechnica.com"},
    CountryOr: []string{gdelt.CountryUS, gdelt.CountryUK},
    NumRecords: 10,
}
```

## Constants

The package includes commonly used country and language codes:

```go
// Countries (FIPS 2-letter codes)
gdelt.CountryUS, gdelt.CountryUK, gdelt.CountryCA, gdelt.CountryAU, ...

// Languages (ISO 639 codes)
gdelt.LangEnglish, gdelt.LangSpanish, gdelt.LangFrench, ...
```

## Response Types

### Article List

```go
articles, _ := client.ArticleSearch(filters)
for _, article := range articles {
    fmt.Println(article.Title)
    fmt.Println(article.URL)
    fmt.Println(article.Domain)
    fmt.Println(article.Language)
    fmt.Println(article.SourceCountry)
    seenTime, _ := article.GetSeenTime()
    fmt.Println(seenTime)
}
```

### Timeline

```go
timeline, _ := client.TimelineSearch(gdelt.ModeTimelineVol, filters)
fmt.Printf("Series: %v\n", timeline.SeriesNames)

for _, row := range timeline.Rows {
    fmt.Printf("%s\n", row.DateTime)
    for name, value := range row.Series {
        fmt.Printf("  %s: %.2f\n", name, value)
    }
    // For ModeTimelineVolRaw:
    if row.AllArticles != nil {
        fmt.Printf("  Total: %d\n", *row.AllArticles)
    }
}
```

## Error Handling

The client returns specific error types for different API responses:

```go
articles, err := client.ArticleSearch(filters)

switch e := err.(type) {
case *gdelt.BadRequestError:
    log.Printf("Bad request: %s", e.Body)
case *gdelt.NotFoundError:
    log.Printf("Not found: %s", e.Message)
case *gdelt.RateLimitError:
    log.Printf("Rate limited: %s", e.Message)
case *gdelt.ServerError:
    log.Printf("Server error (status %d): %s", e.StatusCode, e.Message)
default:
    if err != nil {
        log.Fatal(err)
    }
}
```

## API Notes

1. **Date Range**: The API officially only supports the most recent 3 months of articles.
2. **Rate Limiting**: Be mindful of API rate limits. Add delays between requests if making many queries.
3. **Domain Dashes**: There's a known bug where domains with dashes (`-`) may return 0 results.
4. **Query Limits**: `num_records` must be 250 or less.
5. **Minimum Timespan**: When using "min" unit, the period must be at least 60 minutes.

## License

MIT License - see LICENSE file for details.

## Ported From

This is a Go port of the Python [gdeltdoc](https://github.com/alex9smith/gdelt-doc-api) library.
