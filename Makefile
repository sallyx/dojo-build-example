build:
	rm -rf ./release
	./src/util/buildscripts/build.sh --profile my  --localeList "en-gb,en-us,cs-cz"
