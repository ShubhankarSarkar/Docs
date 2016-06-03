
def getVcapJsonForServices ():
	timeSeriesEnv = subprocess.check_output(["cf", "env" ,my_app_name])
	systemProvidedVars=timeSeriesEnv.split('System-Provided:')[1].split('No user-defined env')[0]
	print systemProvidedVars
	formattedJson = systemProvidedVars.replace("\n","").replace("'","").replace("}{","},{")
	return "["+formattedJson+"]"

def getPredixUAAConfigfromVcaps():
	formattedJson = getVcapJsonForServices()
	print ("formattedJson"  +str(formattedJson))
	d = json.loads(formattedJson)
	uaaIssuerId =  d[0]['VCAP_SERVICES'][uaa_service_name][0]['credentials']['issuerId']
	UAA_URI = d[0]['VCAP_SERVICES'][uaa_service_name][0]['credentials']['uri']
	uaaZoneHttpHeaderName = d[0]['VCAP_SERVICES'][uaa_service_name][0]['credentials']['zone']['http-header-name']
	uaaZoneHttpHeaderValue = d[0]['VCAP_SERVICES'][uaa_service_name][0]['credentials']['zone']['http-header-value']
	return (uaaIssuerId ,UAA_URI,uaaZoneHttpHeaderName ,uaaZoneHttpHeaderValue)

def createClientIdAndAddUser():
	statementStatus  = subprocess.call("uaac  target "+UAA_URI + "  --skip-ssl-validation", shell=True)
	if statementStatus == 1 :
		sys.exit("Error targeting to the UAA instance ")

	# uaac token client get admin -s rmd_uaa_secret
	statementStatus  = subprocess.call("uaac token client get admin -s "+uaaAdminSecret, shell=True)
	if statementStatus == 1 :
		sys.exit("Error binding a Login admin for the UAA instance ")

	# create a client id

	print("****************** Creating client id ******************")
	uaaAddClientRequest =  " --authorized_grant_types authorization_code,client_credentials,refresh_token,password --autoapprove openid "

	uaaAddClientRequest  = uaaAddClientRequest+clientAuthorites+clientScope
	uuacCommandAddClient = " uaac client add " +testAppClientId+ " -s "+testAppSecret +" "+uaaAddClientRequest
	#uaac client add mvp3_ref_app --scope uaa.none,openid --authorized_grant_types authorization_code,client_credentials,refresh_token,password --authorities uaa.resource,uaa.none --autoapprove openid -s mvp3ref@pp
	print uuacCommandAddClient
	statementStatus  = subprocess.call(uuacCommandAddClient, shell=True)
	if statementStatus == 1 :
		sys.exit("Error creating a uaa client id")

	# Add users
	print("****************** Adding users ******************")
	addUAAUser(testUser1 , testUser1Pass, testUser1Email)
	addUAAUser("test_admin_1" , "Test_admin_1", "test_admin_1@gegrctest.com")

def updateClientId( ):
	cmd = "uaac client update "+testAppClientId +clientAuthorites+clientScope
	print ("updating client cmd "+cmd)
	statementStatus  = subprocess.call(cmd , shell=True)
	if statementStatus == 1 :
		sys.exit("Error updating client for zone" +cmd)

def createTimeSeriesInstance():
    timeSeries_payload_filename = 'timeseries_payload.json'
    uaaList = [uaaIssuerId]
    data = {}
    data['trustedIssuerIds'] =uaaList
    with open(timeSeries_payload_filename, 'w') as outfile:
        json.dump(data, outfile)
        outfile.close()

	tsJsonrequest = "cf cs "+predixTimeSeriesService+" "+predixTimeSeriesServicePlan +" "+testTimeSeriesName+ " -c "+os.getcwd()+'/'+timeSeries_payload_filename
	print ("Creating Service cmd "+tsJsonrequest)
	statementStatus  = subprocess.call(tsJsonrequest, shell=True)
	if statementStatus == 1 :
		sys.exit("Error creating an asset service instance")

def getPredixTSConfigfromVcaps():
	formattedJson = getVcapJsonForServices()
	d = json.loads(formattedJson)
	timeseriesZone = d[0]['VCAP_SERVICES'][predixTimeSeriesService][0]['credentials']['query']['zone-http-header-value']
	timeseriesUrl = d[0]['VCAP_SERVICES'][predixTimeSeriesService][0]['credentials']['query']['uri']
	tsInjest = d[0]['VCAP_SERVICES'][predixTimeSeriesService][0]['credentials']['ingest']
	timeSeriesInjestScopes = tsInjest['zone-token-scopes'][0] +"," + tsInjest['zone-token-scopes'][1]
	tsQuery = d[0]['VCAP_SERVICES'][predixTimeSeriesService][0]['credentials']['query']
	timeSeriesQueryScopes = tsQuery['zone-token-scopes'][0] +"," + tsQuery['zone-token-scopes'][1]
	return (timeseriesZone,timeSeriesInjestScopes+","+timeSeriesQueryScopes)

def addUAAUser(userId , password, email):
	addUserCommand = "uaac user add "+userId +" -p "+password+" --emails "+email
	statementStatus  = subprocess.call(addUserCommand, shell=True)
	if statementStatus == 1 :
		sys.exit("Error Adding a User")

def configureManifest(manifestLocation):
	# create a backup
	if os.path.isfile(manifestLocation + "/manifest.yml"):
		shutil.copy(manifestLocation+"/manifest.yml", manifestLocation+"/manifest.yml.bak")
	# copy template as manifest
	shutil.copy(manifestLocation+"/manifest.yml.template", manifestLocation+"/manifest.yml")
	s = open(manifestLocation+"/manifest.yml").read()
	s = s.replace('${uaaService}', uaa_service_instance)
	s = s.replace('${oauthRestHost}', UAA_URI.replace('https://',''))
	s = s.replace('${clientId}', testAppClientId)
	s = s.replace('${secret}', testAppSecret)
	s = s.replace('${timeSeriesService}', testTimeSeriesName)
	s = s.replace('${UAA_SERVER_URL}', UAA_URI)
	s = s.replace('${ENCODED_CLIENTID}', base64.b64encode(testAppClientId+":"+testAppSecret))
	f = open(manifestLocation+"/manifest.yml", 'w')
	f.write(s)
	f.close()
	with open(manifestLocation+'/manifest.yml', 'r') as fin:
		print (fin.read())

def unbindApp(appName,serviceInstance):
	deleteRequest = "cf us " +appName + " "+serviceInstance
	statementStatus  = subprocess.call(deleteRequest, shell=True)
	if statementStatus == 1 :
		print("Error unbinding application: " +deleteRequest)


#######################################
# Begin Main script
#######################################
import subprocess
import sys,getopt
import os
import json
import urllib
import urllib2
import base64
import random
import string
import shutil
import time
import getopt
import argparse

instanceAppender="student26-ts"
testAppClientId = "app-client-id" # uaa client id
testAppSecret = "secret"  # uaa client id secret
testAdminUser = "test_admin_1"
uaaAdminSecret = "app_uaa_secret" #secret for admin
#uaa_adminSecret="app_uaa_secret"

clientAuthorites = " --authorities openid,acs.policies.read,acs.policies.write,acs.attributes.read,acs.attributes.write,uaa.resource,uaa.none"
clientScope = " --scope uaa.none,openid,acs.policies.read,acs.policies.write,acs.attributes.read,acs.attributes.write"
testUser1 = "app_user_1" # user in uaa
testUser1Pass = "password" # password for user testUser1 in uaa
#testUser1 = "app_user_1"
testUser1Email = "app_user_1@gegrctest.ge.com" # email for user testUser1 in uaa

uaa_service_instance="secure-uaa-"+instanceAppender # service instance name for UAA
testTimeSeriesName= "timeseries-"+instanceAppender # service timeseries name for TS

uaa_service_name="predix-uaa-training" # predix service name for uaa
predixAcsService = "predix-acs-training"
predixTimeSeriesService = "predix-timeseries" # predix service name for timeseries

uaa_service_plan="Free" # predix service plan for UAA
predixAcsServicePlan = "Free" # predix service plan for ACS
predixTimeSeriesServicePlan = "Bronze" # predix service plan for TS

global systemProvidedVars
global formattedJson
global timeSeriesEnv
global UAA_URI

#buildRequest = "mvn clean install"
#statementStatus  = subprocess.call(buildRequest, shell=True)
#if statementStatus == 1 :
#	print("Error deleting an application: " +deleteRequest)



my_app_name="ts-workshop-index.html"  # dummy app to bind services

windServiceGitUrl = "https://github.com/PredixDev/winddata-timeseries-service.git" # Github for winddata service
windServiceDir = "winddata-timeseries-service" # Github for winddata folder
windServiceName = "machine-"+windServiceDir+"-"+instanceAppender # Github for winddata service instance name
#windServiceName = "machine-workshop-training4"+instanceAppender # Github for winddata service instance name

predixWebsocketServiceGitUrl = "https://github.com/PredixDev/predix-websocket-server.git"
predixWebsocketServiceDir = "predix-websocket-server"  # Github for websocket service instance name
predixWebsocketName = "machine-client"+windServiceDir+"-"+instanceAppender # Github for websocket service instance name
base_dir = retval = os.getcwd();

## unbind
unbindApp(my_app_name,testTimeSeriesName)
unbindApp(my_app_name,uaa_service_instance)
unbindApp(windServiceName,testTimeSeriesName)
unbindApp(windServiceName,uaa_service_instance)


#Delete $my_app_name

deleteRequest = "cf d -f -r " +my_app_name
statementStatus  = subprocess.call(deleteRequest, shell=True)
if statementStatus == 1 :
	print("Error deleting an application: " +deleteRequest)

deleteRequest = "cf d -f -r " +windServiceName
statementStatus  = subprocess.call(deleteRequest, shell=True)
if statementStatus == 1 :
	print("Error deleting an application: " +deleteRequest)

#Delete Timeseries Instance
deleteRequest = "cf ds -f " +testTimeSeriesName
statementStatus  = subprocess.call(deleteRequest, shell=True)
if statementStatus == 1 :
	print("Error deleting an service: " +deleteRequest)

#Delete UAA Instance
deleteRequest = "cf ds -f " +uaa_service_instance
statementStatus  = subprocess.call(deleteRequest, shell=True)
if statementStatus == 1 :
	print("Error deleting an service: " +deleteRequest)

#Create UAA Instance
createRequest = 'cf cs '+uaa_service_name+' '+uaa_service_plan+' '+uaa_service_instance+' -c "{\\"adminClientSecret\\": \\"'+uaaAdminSecret+'\\"}"'
statementStatus  = subprocess.call(createRequest, shell=True)
if statementStatus == 1 :
	print("Error deleting an service: " +deleteRequest)


#Deploy Timeseries Dataingestion app
deplopyRequest = "cf push --no-route --no-start "+my_app_name
statementStatus  = subprocess.call(deplopyRequest, shell=True)
if statementStatus == 1 :
	print("Error deploying an application: " +deleteRequest)


deplopyRequest = "cf bs "+my_app_name +" " +uaa_service_instance
statementStatus  = subprocess.call(deplopyRequest, shell=True)
if statementStatus == 1 :
	print("Error binding: " +deleteRequest)


#Get UAA params
uaaIssuerId,UAA_URI,uaaZoneHttpHeaderName,uaaZoneHttpHeaderValue = getPredixUAAConfigfromVcaps()
print("****************** UAA configured As ******************")
print ("\n uaaIssuerId = " + uaaIssuerId + "\n UAA_URI = " + UAA_URI + "\n "+uaaZoneHttpHeaderName+" = " +uaaZoneHttpHeaderValue+"\n")
print("****************** ***************** ******************")

createTimeSeriesInstance()

deplopyRequest = "cf bs "+my_app_name +" " +testTimeSeriesName
statementStatus  = subprocess.call(deplopyRequest, shell=True)
if statementStatus == 1 :
	print("Error binding an application: " +deplopyRequest)

timeseriesZone,timeseriesAuths = getPredixTSConfigfromVcaps();
print("timeseriesZone= " + timeseriesZone + "timeseriesAuths ="+timeseriesAuths)


#Create Client Id and Users
createClientIdAndAddUser()

#TS integration to get Authorities for timeseries
clientAuthorites = clientAuthorites+","+timeseriesAuths
updateClientId()


cloneRequest = "git clone "+windServiceGitUrl
statementStatus  = subprocess.call(cloneRequest, shell=True)
if statementStatus == 1 :
	print("Error binding an application: " +cloneRequest)

os.chdir(base_dir+"/"+windServiceDir)

cloneRequest = "mvn clean install -DskipTests=true"
statementStatus  = subprocess.call(cloneRequest, shell=True)
if statementStatus == 1 :
	print("Error binding an application: " +cloneRequest)

os.chdir(base_dir)
configureManifest(windServiceDir)
deployProject ='cf push '+windServiceName+' -f '+windServiceDir+'/manifest.yml'

statementStatus  = subprocess.call(deployProject, shell=True)
if statementStatus == 1 :
	print("Error binding an application: " +deployProject)

print("*****************************")
print("Script set up the completed")
print("*****************************")


#Restage
# since a dummy html app error on restaging no restage
#restageRequest = "cf restage "+my_app_name
#statementStatus  = subprocess.call(restageRequest, shell=True)
# since a dummy app error on restaging ....
#if statementStatus == 1 :
#	print("Error restaging app : " +restageRequest)
