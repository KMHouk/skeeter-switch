using '../main.bicep'

param environment = 'prod'
param location = 'eastus'
param appName = 'skeeter-switch'
param dryRun = false
param locationLat = '40.7128'
param locationLon = '-74.0060'
param iftttEventOn = 'skeeter_switch_on'
param iftttEventOff = 'skeeter_switch_off'
