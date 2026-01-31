package main

import (
	"fmt"
	"log"

	gdelt "github.com/tri/gdelt"
)

func main() {
	client := gdelt.NewClient()

	// Example 1: Simple article search
	fmt.Println("=== Article Search ===")
	startDate := gdelt.MustParseDate("2025-01-30")
	endDate := gdelt.MustParseDate("2025-01-31")

	filters := &gdelt.Filters{
		StartDate:  &startDate,
		EndDate:    &endDate,
		Keyword:    "climate change",
		NumRecords: 10,
	}

	articles, err := client.ArticleSearch(filters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d articles\n", len(articles))
	for i, article := range articles {
		if i >= 3 {
			fmt.Printf("... and %d more\n\n", len(articles)-3)
			break
		}
		fmt.Printf("  %d. %s\n", i+1, article.Title)
		fmt.Printf("     URL: %s\n", article.URL)
		fmt.Printf("     Domain: %s, Language: %s, Country: %s\n\n",
			article.Domain, article.Language, article.SourceCountry)
	}

	// Example 2: Timeline search (volume)
	fmt.Println("=== Timeline Volume Search ===")
	timeline, err := client.TimelineSearch(gdelt.ModeTimelineVol, filters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Timeline Series: %v\n", timeline.SeriesNames)
	fmt.Printf("Number of data points: %d\n\n", len(timeline.Rows))

	if len(timeline.Rows) > 0 {
		fmt.Println("First 5 data points:")
		for i, row := range timeline.Rows {
			if i >= 5 {
				break
			}
			fmt.Printf("  %s: %v\n", row.DateTime.Format("2006-01-02 15:04"), row.Series)
		}
		fmt.Println()
	}

	// Example 3: Timeline search with raw volume
	fmt.Println("=== Timeline Volume Raw Search ===")
	timelineRaw, err := client.TimelineSearch(gdelt.ModeTimelineVolRaw, filters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Timeline Series: %v\n", timelineRaw.SeriesNames)
	if len(timelineRaw.Rows) > 0 {
		fmt.Println("First 3 data points:")
		for i, row := range timelineRaw.Rows {
			if i >= 3 {
				break
			}
			fmt.Printf("  %s: Value=%.2f", row.DateTime.Format("2006-01-02 15:04"), row.Series["Article Count"])
			if row.AllArticles != nil {
				fmt.Printf(", AllArticles=%d", *row.AllArticles)
			}
			fmt.Println()
		}
		fmt.Println()
	}

	// Example 4: Using timespan instead of dates
	fmt.Println("=== Using Timespan ===")
	timespanFilters := &gdelt.Filters{
		Timespan:   "24h",
		Keyword:    "artificial intelligence",
		NumRecords: 5,
	}

	articles2, err := client.ArticleSearch(timespanFilters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d articles for AI in last 24h\n", len(articles2))
	for i, article := range articles2 {
		if i >= 3 {
			break
		}
		fmt.Printf("  %d. %s (%s)\n", i+1, article.Title, article.Domain)
	}
	fmt.Println()

	// Example 5: Using Near and Repeat filters
	fmt.Println("=== Using Near and Repeat Filters ===")
	nearRepeatFilters := &gdelt.Filters{
		Timespan:   "7d",
		Near:       gdelt.Near(5, "climate", "technology"),
		Repeat:     gdelt.Repeat(3, "energy"),
		NumRecords: 5,
	}

	articles3, err := client.ArticleSearch(nearRepeatFilters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d articles with near/repeat filters\n", len(articles3))
	for i, article := range articles3 {
		if i >= 3 {
			break
		}
		fmt.Printf("  %d. %s\n", i+1, article.Title)
	}
	fmt.Println()

	// Example 6: Domain filter
	fmt.Println("=== Domain Filter ===")
	domainFilters := &gdelt.Filters{
		Timespan:   "24h",
		Keyword:    "technology",
		Domain:     "techcrunch.com",
		NumRecords: 5,
	}

	articles4, err := client.ArticleSearch(domainFilters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d articles from TechCrunch\n", len(articles4))
	for i, article := range articles4 {
		if i >= 3 {
			break
		}
		fmt.Printf("  %d. %s\n", i+1, article.Title)
	}

	// Example 7: Tone filter (positive articles)
	fmt.Println("\n=== Tone Filter (Positive) ===")
	toneFilters := &gdelt.Filters{
		Timespan:   "24h",
		Keyword:    "economy",
		Tone:       string(gdelt.ToneGreater) + "5",
		NumRecords: 5,
	}

	articles5, err := client.ArticleSearch(toneFilters)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d positive articles about economy\n", len(articles5))
	for i, article := range articles5 {
		if i >= 3 {
			break
		}
		fmt.Printf("  %d. %s\n", i+1, article.Title)
	}

	// Example 8: Timeline Tone
	fmt.Println("\n=== Timeline Tone ===")
	timelineTone, err := client.TimelineSearch(gdelt.ModeTimelineTone, &gdelt.Filters{
		Timespan: "24h",
		Keyword:  "economy",
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Timeline Tone Series: %v\n", timelineTone.SeriesNames)
	if len(timelineTone.Rows) > 0 {
		fmt.Println("First 5 data points:")
		for i, row := range timelineTone.Rows {
			if i >= 5 {
				break
			}
			fmt.Printf("  %s: Tone=%.2f\n", row.DateTime.Format("15:04"), row.Series["Average Tone"])
		}
	}
}
