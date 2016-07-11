build:
	rm -rf ./release
	./src/util/buildscripts/build.sh --profile my  --localeList "en-gb,en-us,cs-cz"
install:
	chmod g+w,o+w db
	composer install

run:
	sudo supervisord -c ./supervisor.conf

stop:
	sudo kill -SIGTERM supervisord
