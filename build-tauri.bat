@echo off
cd /d G:\AI\Chancellor-OS-Lab\projects\zhimengji
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" > nul
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
echo === starting tauri build ===
where link.exe 2> nul | findstr MSVC
npx tauri build
