package database

import (
	"fmt"
)

// CreateSchema creates all database tables
func (c *Client) CreateSchema() error {
	// Create tables in order (auth first since other tables may reference users)
	if _, err := c.db.Exec(createAuthTablesSQL); err != nil {
		return fmt.Errorf("failed to create auth tables: %w", err)
	}
	if _, err := c.db.Exec(createSearchTablesSQL); err != nil {
		return fmt.Errorf("failed to create search tables: %w", err)
	}
	if _, err := c.db.Exec(createArticleTablesSQL); err != nil {
		return fmt.Errorf("failed to create article tables: %w", err)
	}
	return nil
}

// DropSchema drops all database tables
func (c *Client) DropSchema() error {
	// Drop in reverse order due to foreign key dependencies
	if _, err := c.db.Exec(dropArticleTablesSQL); err != nil {
		return fmt.Errorf("failed to drop article tables: %w", err)
	}
	if _, err := c.db.Exec(dropSearchTablesSQL); err != nil {
		return fmt.Errorf("failed to drop search tables: %w", err)
	}
	if _, err := c.db.Exec(dropAuthTablesSQL); err != nil {
		return fmt.Errorf("failed to drop auth tables: %w", err)
	}
	return nil
}

// Auth tables (users and accounts)
const createAuthTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    profile JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
`

const dropAuthTablesSQL = `
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF NOT EXISTS users CASCADE;
`

// Search tables (saved searches and search history)
const createSearchTablesSQL = `
-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    filters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
`

const dropSearchTablesSQL = `
DROP TABLE IF NOT EXISTS search_history CASCADE;
DROP TABLE IF NOT EXISTS saved_searches CASCADE;
`

// Article tables (bookmarked articles)
const createArticleTablesSQL = `
-- Bookmarked articles
CREATE TABLE IF NOT EXISTS bookmarked_articles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    domain TEXT,
    language TEXT,
    seendate TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_bookmarked_articles_user_id ON bookmarked_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_articles_created_at ON bookmarked_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarked_articles_tags ON bookmarked_articles USING gin(tags);
`

const dropArticleTablesSQL = `
DROP TABLE IF NOT EXISTS bookmarked_articles CASCADE;
`
