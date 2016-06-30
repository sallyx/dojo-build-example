/* run in browser konzole */
var conn = new WebSocket('ws://localhost:8080');
conn.onopen = function(e) {
    console.log("Connection established!");
     conn.send('Nazdar bazar');
};
conn.onmessage = function(e) {
    console.log(e.data);
};
