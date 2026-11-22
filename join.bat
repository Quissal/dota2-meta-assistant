@echo off
chcp 65001 >nul
copy /b "Dota2-Meta-Assistant-1.0.0-portable.part1" + "Dota2-Meta-Assistant-1.0.0-portable.part2" "Dota2-Meta-Assistant-1.0.0-portable.exe"
if errorlevel 1 goto fail
echo OK: Dota2-Meta-Assistant-1.0.0-portable.exe created
goto end
:fail
echo ERROR: could not join parts
:end
pause
