package main

import (
	"flag"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)

var defaultTransport *http.Transport
var client *http.Client

var upgrader = websocket.Upgrader{ReadBufferSize: 0, WriteBufferSize: 0, CheckOrigin: func(r *http.Request) bool {
	return true
}}

func main() {
	port := "2222"

	listenAddr := "0.0.0.0:" + port
	var addr = flag.String("addr", listenAddr, "http service address")
	flag.Parse()
	log.SetFlags(0)
	http.HandleFunc("/", ServeHTTP)
	defaultRoundTripper := http.DefaultTransport
	defaultTransportPointer, ok := defaultRoundTripper.(*http.Transport)
	if !ok {
		panic(fmt.Sprintf("defaultRoundTripper not an *http.Transport"))
	}

	defaultTransport = defaultTransportPointer
	defaultTransport.MaxIdleConns = 5000
	defaultTransport.MaxIdleConnsPerHost = 5000
	client = &http.Client{Transport: defaultTransport}
	fmt.Println("==============================")

	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatalf("error in ListenAndServe: %s", err)
	}
}

func ServeHTTP(wr http.ResponseWriter, r *http.Request) {

	client, err := upgrader.Upgrade(wr, r, wr.Header())

	defer client.Close()

	if err != nil {
		log.Print("upgrade:", err)
		return
	}

	for {
		_, bytes, err := client.ReadMessage()
		fmt.Println(string(bytes))
		if err != nil {
			fmt.Println("Can't read adx request" + err.Error())
			return
		}

	}

	return
}
