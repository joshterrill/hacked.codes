---
title: Exposing Chinese communications in Allen Bradley Factory Talk Echo PLC Software
date: "2023-05-16T21:51:02.314Z"
description: TBD
tags: ["reverse-engineering", "ics"]
published: false
---

Text from dad: 4/26/2023
Article from Reuters: https://www.reuters.com/technology/rockwell-automation-faces-us-government-probe-over-china-ops-wsj-2023-05-10/

Software: Factory Talk Echo
IP addresses:
    47.99.3.1
    47.99.3.10
    47.99.3.20
Port: 44818

Looking at resources for `RA.Logix.DtlBridge.dll` from the *FactoryTalk Logix Echo* PE, we find a DLL called 
RA.RADARDM.WebAPI which has a "Challenge" method that has these params:

TODO: extract decryption method in c#

Username: DownloadAPI
Password: OK6Z@@JbtD79d<Y74RW]ASlYFy<QzToJ
URL: https://radar-downloadapi.rockwellautomation.com/api/v1/challenge

POST https://radar-downloadapi.rockwellautomation.com/api/v1/challenge
Content-Type: application/json
x-www-form-urlencoded body:
	* grant_type: password
	* username: DownloadAPI
	* password: OK6Z@@JbtD79d<Y74RW]ASlYFy<QzToJ

Example response:

```
{"access_token":"LRiWW2N8bplqKCliqk-zJHO2LLGZ8v2CPJ-hpO4c76p4YfTvCL0wEzmw73T7dKo8pU9bzUTvKPW_SxRhscC2092hU3m0puWvM8H30MARD-6LyGhUbAiTapwzRSvb9qVLbtCcri1qtp6T8-yUZ9bBH8ziqCGrYmtJH15IWbSEr79zoBeYgdfDKCPN7Wn6N9EloJemf--yTXUNZZdNoXY9dOkD-wUtz5uBrem_3_iuI7h6MBW8I35jf9BVPEP2lQl-yHauBTOCLki2c5hXkAQzgtRp7T4","token_type":"bearer","expires_in":1799}
```

`RA.RADARDM.Common` DLL has an `APIDetails` class that contains the SSO username and password, along with client key and 
secret keys for generating SSO tokens on behalf of the app. 

TODO: see postman collection
