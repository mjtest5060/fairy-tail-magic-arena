from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess,time,os
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['node','server.js'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env={**os.environ,'PORT':'32991'})
try:
 time.sleep(1)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1440,'height':950},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:32991/',wait_until='domcontentloaded',timeout=30000)
  page.wait_for_timeout(1100)
  print('HOME',page.title(),'errors',errors,'connected',page.locator('#net').inner_text())
  page.screenshot(path=str(ROOT/'v5_home_preview.png'),full_page=False)
  page.locator('#name').fill('검수마도사')
  page.locator('#practice').click()
  page.wait_for_timeout(2200)
  print('BATTLE',page.locator('#battle').get_attribute('class'), 'status',page.locator('#battleMode').inner_text(), 'errors',errors)
  page.screenshot(path=str(ROOT/'v5_battle_preview.png'),full_page=False)
  page.keyboard.down('d');page.wait_for_timeout(900);page.keyboard.up('d')
  page.keyboard.press('w');page.wait_for_timeout(700)
  print('HUD',page.locator('#hptext').inner_text(),'game canvas',page.locator('#arena').get_attribute('width'),'errors',errors)
  page.screenshot(path=str(ROOT/'v5_action_preview.png'),full_page=False)
  browser.close()
except Exception as e:print('BROWSER_SMOKE_FAILED',repr(e))
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except:server.kill()
