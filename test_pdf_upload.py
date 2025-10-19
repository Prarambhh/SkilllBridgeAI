#!/usr/bin/env python3
"""
Test script to verify PDF upload and parsing functionality
"""

import requests
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
import tempfile
import os

def create_test_pdf():
    """Create a simple test PDF with resume content"""
    buffer = io.BytesIO()
    
    # Create PDF
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Add resume content
    y_position = height - 50
    
    resume_content = [
        "John Doe",
        "Software Engineer",
        "",
        "SKILLS:",
        "• Python programming and data analysis",
        "• JavaScript and React development", 
        "• Machine Learning with TensorFlow",
        "• SQL and database management",
        "• Docker and Kubernetes",
        "• Git version control",
        "• AWS cloud services",
        "• Data visualization with matplotlib",
        "• RESTful API development",
        "• Agile development methodologies",
        "",
        "EXPERIENCE:",
        "Senior Developer at Tech Corp (2020-2023)",
        "• Built scalable web applications using React and Node.js",
        "• Implemented machine learning models for data analysis",
        "• Managed cloud infrastructure on AWS",
        "",
        "EDUCATION:",
        "Bachelor of Science in Computer Science",
        "University of Technology (2016-2020)"
    ]
    
    for line in resume_content:
        p.drawString(50, y_position, line)
        y_position -= 20
        if y_position < 50:
            p.showPage()
            y_position = height - 50
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def test_pdf_upload():
    """Test PDF upload and analysis"""
    print("🧪 Testing PDF upload and parsing...")
    
    # 1. Register a test user
    email = f"pdftest{int(__import__('time').time())}@example.com"
    print(f"\n1. Registering test user: {email}")
    
    signup_data = {
        "email": email,
        "password": "testpass123"
    }
    
    signup_response = requests.post("http://localhost:5000/api/auth/signup", json=signup_data)
    print(f"Registration response: {signup_response.status_code}")
    
    if signup_response.status_code != 200:
        print(f"❌ Registration failed: {signup_response.text}")
        return
    
    # Get token from signup response
    signup_result = signup_response.json()
    token = signup_result.get('token')
    
    if not token:
        print("❌ No token received from signup")
        return
    
    print("✅ User registered successfully")
    print("✅ Got auth token from signup")
    
    # 2. Create test PDF
    print("\n2. Creating test PDF...")
    pdf_content = create_test_pdf()
    print(f"✅ Created PDF with {len(pdf_content)} bytes")
    
    # 3. Upload PDF for analysis
    print("\n3. Uploading PDF for analysis...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    files = {
        'file': ('test_resume.pdf', pdf_content, 'application/pdf')
    }
    
    data = {
        'targetRole': 'Data Scientist'
    }
    
    response = requests.post(
        "http://localhost:5000/api/ai/resume/analyze",
        headers=headers,
        files=files,
        data=data
    )
    
    print(f"Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ PDF analysis successful!")
        print(f"\n📊 ANALYSIS RESULTS:")
        extracted_skills = result.get('extracted_skills', [])
        print(f"Skills detected: {len(extracted_skills)}")
        print(f"Skills: {extracted_skills[:10]}...")  # Show first 10 skills
        print(f"Resume score: {result.get('resume_score', 'N/A')}")
        print(f"Role fit: {result.get('fit', 'N/A')}%")
        print(f"Executive summary: {result.get('summary', 'N/A')[:100]}...")
        print(f"Missing skills: {result.get('missing_skills', [])[:5]}...")  # Show first 5 missing skills
        
        if len(extracted_skills) > 0:
            print("✅ PDF parsing and skills detection working!")
        else:
            print("❌ No skills detected - PDF parsing may have failed")
    else:
        print(f"❌ Analysis failed: {response.text}")

if __name__ == "__main__":
    test_pdf_upload()