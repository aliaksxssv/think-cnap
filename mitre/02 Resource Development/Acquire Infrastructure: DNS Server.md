### DNS Rebind

https://lock.cmpxchg8b.com/rebinder.html

``` bash
nslookup 7f000001.a9fea9fe.rbndr.us 8.8.8.8
Server:         8.8.8.8
Address:        8.8.8.8#53

Non-authoritative answer:
Name:   7f000001.a9fea9fe.rbndr.us
Address: 169.254.169.254
```

AWS GuardDuty Detection:
- UnauthorizedAccess:EC2/MetadataDNSRebind
- UnauthorizedAccess:Runtime/MetadataDNSRebind