@echo off

rem  Copyright (c) 2012-2015 General Electric Company. All rights reserved.
rem  The copyright to the computer software herein is the property of
rem  General Electric Company. The software may be used and/or copied only
rem  with the written permission of General Electric Company or in accordance
rem  with the terms and conditions stipulated in the agreement/contract
rem  under which the software has been supplied

setlocal EnableDelayedExpansion

rem
rem There must be an argument for the downloaded eclipse.zip
rem 
set MACHINE_BUILD_VERSION=15.3.0

if exist "%UserProfile%\.mbsruntime" (
    echo The file %UserProfile%\.mbsruntime must not exist. Please rename or remove it.
 GOTO :EOF
)

IF [%1] == [] (
    echo ####################  E R R O R ######################
    echo No eclipse.zip supplied
    echo ######################################################
    GOTO :Usage
) ELSE IF ["%1"] == ["-usage"] (
    GOTO :Usage
) ELSE IF ["%1"] == ["?"] (
    GOTO :Usage
)
if NOT exist "%1" (
    echo ####################  E R R O R ######################
    echo eclipse.zip not found
    echo ######################################################
    GOTO :Usage
)


IF ["%2"] == ["-PROV"] (
    Call mvn clean install -Declipse.archive="%1"
    Call mvn exec:exec -Dimage.file=tid_predix-provision.img -Doutput.folder=PredixMachine-provision-%MACHINE_BUILD_VERSION%
) ELSE IF ["%2"] == ["-DEBUG"] (
    Call mvn clean install -Declipse.archive="%1"
    Call mvn exec:exec -Dimage.file=tid_predix-full.img -Doutput.folder=PredixMachine-debug-%MACHINE_BUILD_VERSION%
) ELSE IF ["%2"] == ["-FCS"] (
    Call mvn clean install -Declipse.archive="%1"
    Call mvn exec:exec -Dimage.file=tid_predix-fcs.img -Doutput.folder=FCS-%MACHINE_BUILD_VERSION%
) ELSE IF ["%2"] == ["-BB"] (
    Call mvn clean install -Declipse.archive="%1"
    Call mvn exec:exec -Dimage.file=tid_predix-busbridge.img -Doutput.folder=BusBridge-%MACHINE_BUILD_VERSION%
) ELSE IF ["%2"] == ["-STS"]  (
    Call mvn clean install -Declipse.archive="%1"
    Call mvn exec:exec -Dimage.file=tid_predix-sts.img -Doutput.folder=STS-%MACHINE_BUILD_VERSION%
) ELSE IF ["%2"] == ["-CUSTOM"] (
    IF NOT [%3] == [] (
        IF EXIST "%3" (
            FOR /F %%i in ("%3") do SET BN=%%~nxi
            FOR %%F in ("%3") do SET DN=%%~dpF
        ECHO  mvn exec:exec -Dimage.file="!BN!" -Doutput.folder="PredixMachine-!BN!-%MACHINE_BUILD_VERSION%" -Dimage.folder="!DN!"            
            CALL mvn clean install -Declipse.archive="%1"
            CALL mvn exec:exec -Dimage.file="!BN!" -Doutput.folder="PredixMachine-!BN!-%MACHINE_BUILD_VERSION%" -Dimage.folder="!DN!"            
        ) ELSE (
            ECHO ####################  E R R O R ######################
            ECHO File %3 could not be read. Please provide the path to a valid custom image file
            ECHO ######################################################
            GOTO :Usage
        )
    ) ELSE (
        ECHO ####################  E R R O R ######################
        ECHO Please provide the path to your custom image file
        ECHO ######################################################
        GOTO :Usage        
    )
) ELSE IF [%2] == []  (
    CALL mvn clean install -Declipse.archive="%1"
    CALL mvn exec:exec -Dimage.file=tid_predix-release.img -Doutput.folder=PredixMachine-%MACHINE_BUILD_VERSION%
) ELSE (
    ECHO ####################  E R R O R ######################
    ECHO Please provide a valid container type
    ECHO ######################################################
    GOTO :Usage
)
GOTO :EOF
 
:Usage
    ECHO GenerateContainers [path to the down loaded eclipse.zip] [optional:Type of container]
    ECHO         Type of containers options: "-PROV | -DEBUG | -FCS | -BB | -STS | -CUSTOM <img file path> | [not specified]"
    ECHO         If [Type of container] is not specified then create default Predix Machine container
    GOTO :EOF


