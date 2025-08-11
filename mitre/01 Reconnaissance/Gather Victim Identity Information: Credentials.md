## GitHub Search

https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28#search-code

``` bash
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/search/code?q=aws_access_key_id"
``` 

### Detection
- AWS Health Dashboard: Risk IAM quarantine