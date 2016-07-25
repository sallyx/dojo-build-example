# WebSocket with Rachet

Example of store WebSocket store with REST fallback if WebSocket is not working.

## Install

### Step 1
```bash
git clone git@github.com:sallyx/dojo-build-example.git -b rachet mydir
cd mydir
git submodule update --recursive --init
composer install
mkdir db
chmod o+w db
```

### Step 2
Update RewriteBase in rest/.htaccess

### Step 3

Configure apache to support REST. For example, in /etc/apache2/mod_userdir.conf:

```xml
<Directory /home/*/public_html>
	...
        <Limit GET POST PUT DELETE OPTIONS PROPFIND>
            Require all granted
        </Limit>
        <LimitExcept GET POST PUT DELETE OPTIONS PROPFIND>
            Require all denied
        </LimitExcept>
	...
</Directory>
```

Restart apache.


## Run rachet

```bash
php bin/chat-server.php
```
