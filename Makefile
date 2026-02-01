.PHONY: install proto proto-go proto-ts db-drop db-init dev

install:
	cd app && bun install
	go mod download

proto:
	rm -rf app/gen
	cd proto && buf generate --template buf.gen.ts.yaml
	rm -rf server/gen
	cd proto && buf generate --template buf.gen.go.yaml

proto-ts:
	rm -rf app/gen
	cd proto && buf generate --template buf.gen.ts.yaml

proto-go:
	rm -rf server/gen
	cd proto && buf generate --template buf.gen.go.yaml

db-drop:
	go run cmd/cli/main.go drop

db-init:
	go run cmd/cli/main.go init

dev:
	./tmux.dev.sh
