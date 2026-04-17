using '../main.bicep'

param environment = 'dev'
param location = 'eastus'
param appName = 'skeeter-switch'
param dryRun = true
param locationLat = '40.7128'
param locationLon = '-74.0060'
param iftttEventOn = 'skeeter_switch_on'
param iftttEventOff = 'skeeter_switch_off'
