import asyncio, json, urllib.request, urllib.error
async def main():
    data = json.dumps({"username": "testapi2", "password": "test123"}).encode()
    req = urllib.request.Request("http://localhost:8080/api/register", data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        print(f"Status: {resp.status}")
        print(f"Body: {resp.read().decode()}")
    except urllib.error.HTTPError as e:
        print(f"Status: {e.code}")
        print(f"Body: {e.read().decode()}")
asyncio.run(main())
