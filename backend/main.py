from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import zipfile
import json
from typing import List, Optional
from pydantic import BaseModel

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from latex_generator import LatexGenerator

app = FastAPI(title="LOD Matrix LaTeX Generator", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessingConfig(BaseModel):
    excluded_columns: List[str] = ["B", "C", "D", "E"]
    column_widths: dict = {
        "A": "4.0",
        "B": "4.0", 
        "C": "2.0"
    }
    total_table_width: Optional[float] = None

@app.get("/")
async def root():
    return {"message": "LOD Matrix LaTeX Generator API"}

@app.post("/api/generate-latex")
async def generate_latex(
    file: UploadFile = File(...),
    excluded_columns: str = Form('["B", "C", "D", "E"]'),
    column_widths: str = Form('{"A": "4.0", "B": "4.0", "C": "2.0"}'),
    total_table_width: Optional[str] = Form(None)
):
    try:
        excluded = json.loads(excluded_columns)
        widths = json.loads(column_widths)
        
        total_width = None
        if total_table_width and total_table_width.strip():
            try:
                total_width = float(total_table_width.strip())
            except ValueError:
                raise HTTPException(status_code=400, detail="total_table_width must be a valid number")
        
        print(f"Processing with excluded columns: {excluded}")
        print(f"Processing with column widths: {widths}")
        if total_width:
            print(f"Using auto-distribution with total width: {total_width}cm")
        else:
            print("Using manual column widths")
        
        if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Please upload a valid Excel file")
        
        content = await file.read()
        generator = LatexGenerator()
        
        config = {
            "excluded_columns": excluded,
            "column_widths": widths
        }
        
        # Add total_table_width if provided (for auto-distribution)
        if total_width is not None:
            config["total_table_width"] = total_width
        
        latex_files = generator.process_excel(content, config)
        print(f"Generated {len(latex_files)} files")
        
        if not latex_files:
            raise HTTPException(status_code=400, detail="No LaTeX files could be generated")
        
        return {
            "files": latex_files,
            "count": len(latex_files),
            "sheet_names": list(latex_files.keys()),
            "debug": "Files generated successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download-zip")
async def download_zip(
    latex_files: dict
):
    try:
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename, content in latex_files.items():
                zip_file.writestr(filename, content)
        
        zip_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(zip_buffer.getvalue()),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=latex_tables.zip"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/test-upload")
async def test_upload(file: UploadFile = File(...)):
    return {"filename": file.filename, "content_type": file.content_type}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)