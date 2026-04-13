@echo off
echo Initializing Git repository...
git init

echo Adding files...
git add .

echo Committing files...
git commit -m "Initial commit: Dynamic Snake Game deployed on Cloud Run"

echo Setting main branch...
git branch -M main

echo Adding remote origin...
git remote add origin https://github.com/Mahesh-Nandigam/First-Repo.git

echo Pushing to GitHub...
git push -u origin main

echo.
echo Process complete. Press any key to exit.
pause
