using '../main.bicep'

param environment = 'dev'
param location = 'eastus'
param appName = 'skeeter-switch'
param dryRun = true
param locationLat = '38.8816'
param locationLon = '-77.1311'
param iftttEventOn = 'skeeter_switch_on'
param iftttEventOff = 'skeeter_switch_off'
