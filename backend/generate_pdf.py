from reportlab.pdfgen import canvas

c = canvas.Canvas("d:/projects/LLMforge/sample_test_doc.pdf")
c.drawString(100, 800, "LLMForge Technical Documentation")
c.drawString(100, 780, "=================================")
c.drawString(100, 750, "Introduction:")
c.drawString(100, 730, "LLMForge is an advanced platform designed to orchestrate, evaluate, and monitor")
c.drawString(100, 715, "complex LLM workflows in production environments. It provides deep observability")
c.drawString(100, 700, "into model behavior, latency, and costs.")

c.drawString(100, 660, "Key Features:")
c.drawString(100, 640, "1. A/B Prompt Testing: Evaluate prompt permutations against test cases.")
c.drawString(100, 625, "2. Real-time Monitoring: View telemetry, latencies, and usage costs.")
c.drawString(100, 610, "3. Heuristic Evaluations: Automated evaluation of model responses using RAGAS.")

c.drawString(100, 570, "Architecture:")
c.drawString(100, 550, "The frontend is built with React/Next.js and styled with Tailwind CSS v4.")
c.drawString(100, 535, "The backend runs on FastAPI, using Supabase for telemetry storage.")
c.save()
print("PDF created successfully.")
