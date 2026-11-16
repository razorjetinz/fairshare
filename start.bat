@echo off
set PORT=4173
if not "%1"=="" set PORT=%1
echo Starting FairShare at http://localhost:%PORT%
py -m http.server %PORT%
