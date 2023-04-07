

Things to go over:

1. Dynamic analaysis of RSLogix, finding the tmp file it writes, uways to extract information from it (use rust integrity script). Using procmon, tcpmon, and procexp programs.

TODO: Possible point of attack if you can overwrite this file?

2. Analyzing general network traffic, upload/download, all commands, fuzzing undocumented commands, etc. Even looking at binary file for rslogix in IDA Pro shows these are UNDOCUMENTED in the FileType enum

3. Writing code that sends network commands (use rust chatgpt script)

4. Crack password protected .RSS files

no password vs 4321 password
4321 password vs 13371337 password, notice how UNTITLED text gets clipped the exact length of the new password

5. 


-------------------

Write machine learning or script that recognizes rogue traffic. 
Write code that creates checksums for the ladder logic to make sure that it hasn't changed
Write something that analyzes PLC in memory instructions to make sure it hasn't changed