#!/usr/bin/env python3
"""
Quick Manual Test Guide for AdAgent
Test your endpoints manually
"""

print("🚀 AdAgent Quick Testing Guide")
print("=" * 50)

print("\n1️⃣ Test Basic Data Loading")
print("-" * 30)
print("✨ Test segments loading:")
print("   python3 -c \"exec(open('../audience/module.py').read()); print(list_segments())\"")

print("\n✨ Test preferences loading:")
print("   python3 -c \"exec(open('../prefs/module.py').read()); print(get_preferences('sample_adv'))\"")

print("\n2️⃣ Start Your Server")
print("-" * 30)
print("✨ Start server (Terminal 1):")
print("   cd server")
print("   export OPENAI_API_KEY='your_key_here'")
print("   uvicorn main:app --reload --host 127.0.0.1 --port 8000")

print("\n3️⃣ Test API Endpoints (Terminal 2)")
print("-" * 30)
print("✨ Health check:")
print("   curl -s http://localhost:8000/health | jq")

print("\n✨ Get segments:")
print("   curl -s http://localhost:8000/segments | jq")

print("\n✨ Agent status:")
print("   curl -s http://localhost:8000/agent/status | jq")

print("\n✨ Test chat:")
print("""   curl -X POST http://localhost:8000/chat \\
     -H "Content-Type: application/json" \\
     -d '{"message": "Hello, help me create a campaign"}' | jq""")

print("\n4️⃣ Run Your Comprehensive Tests")
print("-" * 30)
print("✨ Once server is running:")
print("   pip install requests  # if needed")
print("   python3 test_server_comprehensive.py --url http://localhost:8000")

print("\n5️⃣ Frontend Testing Setup")
print("-" * 30) 
print("✨ Set up React testing:")
print("   cd client")
print("   npm install --save-dev @testing-library/react @testing-library/jest-dom jest vitest")

print("\n🎉 You have EXCELLENT testing infrastructure!")
print("   - Comprehensive backend tests (12+ test cases)")
print("   - API endpoint validation")
print("   - Agent workflow testing")
print("   - Data loading verification")

print("\n🔥 Next Steps:")
print("   1. Pick one of the above testing approaches")
print("   2. Set up your OpenAI API key")
print("   3. Run the comprehensive test suite!") 