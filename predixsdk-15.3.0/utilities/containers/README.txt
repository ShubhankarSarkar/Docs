This is a utility for generating Predix Machine containers without having to install the SDK into an Eclipse environment.
This tool can also be used for a continuous integration model.

Requirements: Eclipse and Maven.
    Download an eclipse for generation. This should stay in the zip or tar.gz form. 
    i.e. https://eclipse.org/downloads/ and select the "Eclipse IDE for Java Developers" 
    Whatever Eclipse is selected must have the PDE runtime plugins. This would include the JEE version.

Run the script for Unix, Linux:
    ./GenerateContainers [path to the down loaded eclipse.tar.gz] [Type of container]
Run the script for Windows:
    GenerateContainers.bat "[path to the down loaded eclipse.zip ]" [Type of container]

For example:
    GenerateContainers "/Users/{login}/Desktop/eclipse-standard-luna-SR1-macosx-cocoa-x86_64.tar.gz"

Type of  containers options: -PROV, -DEBUG, -FCS, -BB, -STS, -CUSTOM or [not specified]
    -PROV = Predix Machine container with provision
    -DEBUG = Predix Machine container with web console
    -FCS = Fabric Configuration Service container
    -BB = Bus Bridge container
    -STS = Security Token Service container
    -CUSTOM <img file path> = Generate container based on custom image file. 
    [not specified] - Default Predix Machine container


NOTE: ignore this console error if it occurs:

java.lang.ClassCastException: org.eclipse.osgi.internal.framework.EquinoxConfiguration$1 cannot be cast to java.lang.String
    at org.eclipse.m2e.logback.configuration.LogHelper.logJavaProperties(LogHelper.java:26)
    at org.eclipse.m2e.logback.configuration.LogPlugin.loadConfiguration(LogPlugin.java:189)
    at org.eclipse.m2e.logback.configuration.LogPlugin.configureLogback(LogPlugin.java:144)
    at org.eclipse.m2e.logback.configuration.LogPlugin.access$2(LogPlugin.java:107)
    at org.eclipse.m2e.logback.configuration.LogPlugin$1.run(LogPlugin.java:62)
    at java.util.TimerThread.mainLoop(Timer.java:555)
    at java.util.TimerThread.run(Timer.java:505)
