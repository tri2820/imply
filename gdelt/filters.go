package gdelt

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Common country codes (FIPS 2-letter codes)
const (
	CountryUS          = "US"
	CountryUK          = "UK"
	CountryCA          = "CA"
	CountryAU          = "AU"
	CountryDE          = "DE"
	CountryFR          = "FR"
	CountryJP          = "JP"
	CountryCN          = "CN"
	CountryIN          = "IN"
	CountryBR          = "BR"
	CountryRU          = "RU"
	CountryKR          = "KR"
	CountryIT          = "IT"
	CountryES          = "ES"
	CountryMX          = "MX"
	CountryID          = "ID"
	CountryNL          = "NL"
	CountrySA          = "SA"
	CountryCH          = "CH"
	CountrySE          = "SE"
	CountryTR          = "TR"
	CountryBE          = "BE"
	CountryAR          = "AR"
	CountryPL          = "PL"
	CountryZA          = "ZA"
	CountryTH          = "TH"
	CountryEG          = "EG"
	CountryMY          = "MY"
	CountrySG          = "SG"
	CountryPH          = "PH"
	CountryPK          = "PK"
	CountryBD          = "BD"
	CountryNG          = "NG"
	CountryVN          = "VN"
	CountryIR          = "IR"
	CountryCL          = "CL"
	CountryFI          = "FI"
	CountryDK          = "DK"
	CountryNO          = "NO"
	CountryIE          = "IE"
	CountryAT          = "AT"
	CountryIL          = "IL"
	CountryNZ          = "NZ"
	CountryGR          = "GR"
	CountryPT          = "PT"
	CountryCZ          = "CZ"
	CountryHU          = "HU"
	CountryUA          = "UA"
	CountryHK          = "HK"
	CountryCO          = "CO"
	CountryRO          = "RO"
	CountryVE          = "VE"
)

// Common language codes (ISO 639)
const (
	LangEnglish    = "en"
	LangSpanish    = "es"
	LangFrench     = "fr"
	LangGerman     = "de"
	LangItalian    = "it"
	LangPortuguese = "pt"
	LangRussian    = "ru"
	LangChinese    = "zh"
	LangJapanese   = "ja"
	LangKorean     = "ko"
	LangArabic     = "ar"
	LangHindi      = "hi"
	LangIndonesian = "id"
	LangTurkish    = "tr"
	LangDutch      = "nl"
	LangPolish     = "pl"
	LangVietnamese = "vi"
	LangThai       = "th"
	LangSwedish    = "sv"
	LangGreek      = "el"
	LangCzech      = "cs"
	LangRomanian   = "ro"
	LangHungarian  = "hu"
	LangDanish     = "da"
	LangFinnish    = "fi"
	LangNorwegian  = "no"
	LangHebrew     = "he"
	LangUkrainian  = "uk"
	LangFarsi      = "fa"
	LangBengali    = "bn"
	LangTagalog    = "tl"
	LangSwahili    = "sw"
)

// Valid timespan units
var validTimespanUnits = map[string]bool{
	"min": true, "h": true, "hours": true,
	"d": true, "days": true,
	"w": true, "weeks": true,
	"m": true, "months": true,
}

// DateInput allows flexible date input (string or time.Time)
type DateInput interface{}

// Near creates a filter for finding words within n words of each other
// Example: near(5, "airline", "climate") finds "airline" and "climate" within 5 words
func Near(n int, words ...string) string {
	if len(words) < 2 {
		panic("near() requires at least 2 words")
	}
	return fmt.Sprintf("near%d:\"%s\" ", n, strings.Join(words, " "))
}

// MultiNear creates multiple near filters combined with AND or OR
// Example: multiNear([]NearConfig{{5, []string{"airline", "crisis"}}, {10, []string{"airline", "climate", "change"}}}, "AND")
func MultiNear(configs []NearConfig, method string) string {
	if method != "AND" && method != "OR" {
		panic("method must be AND or OR")
	}

	var formatted []string
	for _, c := range configs {
		formatted = append(formatted, Near(c.Distance, c.Words...))
	}

	if len(formatted) == 1 {
		return formatted[0]
	}

	if method == "OR" {
		return "(" + strings.Join(formatted, " OR ") + ") "
	}
	return strings.Join(formatted, " AND ")
}

// NearConfig configures a near filter
type NearConfig struct {
	Distance int
	Words    []string
}

// Repeat creates a filter for finding a word repeated at least n times
// Example: Repeat(3, "environment") finds articles with "environment" at least 3 times
func Repeat(n int, word string) string {
	if strings.Contains(word, " ") {
		panic("repeat() only supports single words")
	}
	return fmt.Sprintf("repeat%d:\"%s\" ", n, word)
}

// MultiRepeat creates multiple repeat filters combined with AND or OR
// Example: multiRepeat([]RepeatConfig{{2, "airline"}, {3, "airport"}}, "AND")
func MultiRepeat(configs []RepeatConfig, method string) string {
	if method != "AND" && method != "OR" {
		panic("method must be AND or OR")
	}

	var toRepeat []string
	for _, c := range configs {
		toRepeat = append(toRepeat, Repeat(c.Count, c.Word))
	}

	if method == "AND" {
		return strings.Join(toRepeat, "AND ")
	}
	return "(" + strings.Join(toRepeat, " OR ") + ") "
}

// RepeatConfig configures a repeat filter
type RepeatConfig struct {
	Count int
	Word  string
}

// ToneOp represents tone comparison operators
type ToneOp string

const (
	ToneGreater      ToneOp = ">"
	ToneLess         ToneOp = "<"
	ToneGreaterEqual ToneOp = ">="
	ToneLessEqual    ToneOp = "<="
)

// ToneFilter creates a tone filter
// Example: ToneFilter(ToneGreater, "5") for tone>5
func ToneFilter(op ToneOp, value string) string {
	return fmt.Sprintf("tone%s%s ", op, value)
}

// ToneAbsFilter creates a tone absolute filter
// Example: ToneAbsFilter(ToneGreater, "5") for toneabs>5
func ToneAbsFilter(op ToneOp, value string) string {
	return fmt.Sprintf("toneabs%s%s ", op, value)
}

// Filters holds all filter parameters for GDELT API queries
type Filters struct {
	// Date filters - either start/end date OR timespan must be provided
	StartDate   *time.Time
	EndDate     *time.Time
	Timespan    string
	NumRecords  int
	Keyword     string
	KeywordOr   []string // Alternative: multiple keywords OR'd together
	Domain      string
	DomainOr    []string // Alternative: multiple domains OR'd together
	DomainExact string
	DomainExactOr []string
	Country     string
	CountryOr   []string
	Language    string
	LanguageOr  []string
	Theme       string
	ThemeOr     []string
	Near        string
	Repeat      string
	Tone        string
	ToneAbs     string
}

// BuildQueryString constructs the query string for the API
func (f *Filters) BuildQueryString() (string, error) {
	var queryParts []string
	var params []string

	// Validate date settings
	hasDates := f.StartDate != nil || f.EndDate != nil
	hasTimespan := f.Timespan != ""

	if !hasDates && !hasTimespan {
		return "", errors.New("must provide either StartDate/EndDate or Timespan")
	}
	if hasDates && hasTimespan {
		return "", errors.New("cannot provide both StartDate/EndDate and Timespan")
	}

	// Add keyword
	if f.Keyword != "" {
		queryParts = append(queryParts, fmt.Sprintf("\"%s\"", f.Keyword))
	} else if len(f.KeywordOr) > 0 {
		var keywords []string
		for _, kw := range f.KeywordOr {
			if strings.Contains(kw, " ") {
				keywords = append(keywords, fmt.Sprintf("\"%s\"", kw))
			} else {
				keywords = append(keywords, kw)
			}
		}
		queryParts = append(queryParts, "("+strings.Join(keywords, " OR ")+") ")
	}

	// Add domain
	if f.Domain != "" {
		queryParts = append(queryParts, fmt.Sprintf("domain:%s ", f.Domain))
	} else if len(f.DomainOr) > 0 {
		var domains []string
		for _, d := range f.DomainOr {
			domains = append(domains, fmt.Sprintf("domain:%s", d))
		}
		queryParts = append(queryParts, "("+strings.Join(domains, " OR ")+") ")
	}

	// Add domain_exact
	if f.DomainExact != "" {
		queryParts = append(queryParts, fmt.Sprintf("domainis:%s ", f.DomainExact))
	} else if len(f.DomainExactOr) > 0 {
		var domains []string
		for _, d := range f.DomainExactOr {
			domains = append(domains, fmt.Sprintf("domainis:%s", d))
		}
		queryParts = append(queryParts, "("+strings.Join(domains, " OR ")+") ")
	}

	// Add country
	if f.Country != "" {
		queryParts = append(queryParts, fmt.Sprintf("sourcecountry:%s ", f.Country))
	} else if len(f.CountryOr) > 0 {
		var countries []string
		for _, c := range f.CountryOr {
			countries = append(countries, fmt.Sprintf("sourcecountry:%s", c))
		}
		queryParts = append(queryParts, "("+strings.Join(countries, " OR ")+") ")
	}

	// Add language
	if f.Language != "" {
		queryParts = append(queryParts, fmt.Sprintf("sourcelang:%s ", f.Language))
	} else if len(f.LanguageOr) > 0 {
		var langs []string
		for _, l := range f.LanguageOr {
			langs = append(langs, fmt.Sprintf("sourcelang:%s", l))
		}
		queryParts = append(queryParts, "("+strings.Join(langs, " OR ")+") ")
	}

	// Add theme
	if f.Theme != "" {
		queryParts = append(queryParts, fmt.Sprintf("theme:%s ", f.Theme))
	} else if len(f.ThemeOr) > 0 {
		var themes []string
		for _, t := range f.ThemeOr {
			themes = append(themes, fmt.Sprintf("theme:%s", t))
		}
		queryParts = append(queryParts, "("+strings.Join(themes, " OR ")+") ")
	}

	// Add tone
	if f.Tone != "" {
		if err := validateTone(f.Tone); err != nil {
			return "", err
		}
		queryParts = append(queryParts, "tone"+f.Tone+" ")
	}

	// Add tone absolute
	if f.ToneAbs != "" {
		if err := validateTone(f.ToneAbs); err != nil {
			return "", err
		}
		queryParts = append(queryParts, "toneabs"+f.ToneAbs+" ")
	}

	// Add near
	if f.Near != "" {
		queryParts = append(queryParts, f.Near)
	}

	// Add repeat
	if f.Repeat != "" {
		queryParts = append(queryParts, f.Repeat)
	}

	// Add date filters
	if f.StartDate != nil {
		if f.EndDate == nil {
			return "", errors.New("must provide both StartDate and EndDate")
		}
		params = append(params, fmt.Sprintf("startdatetime=%s", formatDate(f.StartDate)))
		params = append(params, fmt.Sprintf("enddatetime=%s", formatDate(f.EndDate)))
	} else if f.Timespan != "" {
		if err := validateTimespan(f.Timespan); err != nil {
			return "", err
		}
		params = append(params, fmt.Sprintf("timespan=%s", f.Timespan))
	}

	// Add num_records
	if f.NumRecords > 250 {
		return "", fmt.Errorf("num_records must be 250 or less, got %d", f.NumRecords)
	}
	params = append(params, fmt.Sprintf("maxrecords=%d", f.NumRecords))

	return strings.Join(queryParts, "") + "&" + strings.Join(params, "&"), nil
}

// validateTone checks if tone filter is valid
func validateTone(tone string) error {
	if !strings.Contains(tone, "<") && !strings.Contains(tone, ">") {
		return errors.New("tone must contain either greater than (>) or less than (<)")
	}
	if strings.Contains(tone, "=") && !strings.Contains(tone, ">=") && !strings.Contains(tone, "<=") {
		return errors.New("tone cannot contain standalone '='")
	}
	return nil
}

// validateTimespan checks if timespan format is valid
func validateTimespan(timespan string) error {
	re := regexp.MustCompile(`^(\d+)([a-z]+)$`)
	matches := re.FindStringSubmatch(timespan)
	if matches == nil {
		return fmt.Errorf("timespan %s is invalid", timespan)
	}

	value := matches[1]
	unit := matches[2]

	if !validTimespanUnits[unit] {
		return fmt.Errorf("timespan unit %s is not supported (must be one of: min, h, hours, d, days, w, weeks, m, months)", unit)
	}

	// Check if value is numeric
	if _, err := strconv.Atoi(value); err != nil {
		return fmt.Errorf("timespan value %s is not a valid integer", value)
	}

	minutes, err := strconv.Atoi(value)
	if err != nil {
		return err
	}

	// Minimum 60 minutes for "min" unit
	if unit == "min" && minutes < 60 {
		return fmt.Errorf("timespan must be at least 60 minutes when using 'min' unit")
	}

	return nil
}

// formatDate converts a time.Time to the API format (YYYYMMDDHHMMSS)
func formatDate(t *time.Time) string {
	return t.UTC().Format("20060102150405")
}

// ParseDate parses a date string in YYYY-MM-DD format to time.Time
func ParseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

// MustParseDate parses a date string and panics on error
func MustParseDate(dateStr string) time.Time {
	t, err := ParseDate(dateStr)
	if err != nil {
		panic(err)
	}
	return t
}
