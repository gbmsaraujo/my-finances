.PHONY: ready lint test build

ready: lint test build

lint:
	npm run lint

test:
	npm run test

build:
	npm run build
