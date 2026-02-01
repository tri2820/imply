module imply

go 1.24.0

require (
	connectrpc.com/connect v1.19.1
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/jackc/pgx/v5 v5.7.2
	github.com/tri2820/gdelt v0.0.0-00010101000000-000000000000
	golang.org/x/net v0.49.0
	google.golang.org/protobuf v1.36.9
)

require (
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	golang.org/x/crypto v0.47.0 // indirect
	golang.org/x/sync v0.19.0 // indirect
	golang.org/x/text v0.33.0 // indirect
)

replace github.com/tri2820/gdelt => ./gdelt
