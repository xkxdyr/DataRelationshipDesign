from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 捕获控制台日志
    page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
    
    # 访问前端页面
    print("访问前端页面...")
    page.goto('http://localhost:3002/')
    page.wait_for_load_state('networkidle')
    
    # 截图
    page.screenshot(path='/tmp/frontend.png', full_page=True)
    print("截图已保存到 /tmp/frontend.png")
    
    # 检查页面标题
    title = page.title()
    print(f"页面标题: {title}")
    
    # 检查是否有错误
    console_messages = []
    page.on("console", lambda msg: console_messages.append(msg.text))
    
    # 等待一下让页面完全加载
    page.wait_for_timeout(2000)
    
    # 打印控制台消息
    print("\n控制台消息:")
    for msg in console_messages:
        print(f"  {msg}")
    
    browser.close()
    print("\n测试完成！")
