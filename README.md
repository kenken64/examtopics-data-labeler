# ExamTopics Data Labeler

This project provides a web application to convert PDF files into Markdown format. It features a user-friendly interface where you can upload a PDF, view it page by page, and then convert the selected page (or the entire document if no page is selected) into Markdown.

## Features

- **PDF Upload**: Easily upload PDF documents.
- **PDF Viewer**: View PDF pages directly in the browser with navigation controls.
- **Markdown Conversion**: Convert PDF content to Markdown using a Python backend.
- **Page-specific Conversion**: Convert a specific page of the PDF to Markdown.

## Technologies Used

### Backend

- **Flask**: A micro web framework for Python.
- **docling**: A library for document processing and conversion.
- **pypdf**: A pure-Python PDF library capable of splitting, merging, cropping, and transforming PDF pages.
- **Flask-Cors**: A Flask extension for handling Cross Origin Resource Sharing (CORS), making cross-origin AJAX possible.

### Frontend

- **Next.js**: A React framework for building production-ready web applications.
- **React**: A JavaScript library for building user interfaces.
- **pdfjs-dist**: A PDF rendering library from Mozilla.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.

## Setup and Installation

Follow these steps to set up and run the project locally.

### Prerequisites

- Node.js (LTS version recommended)
- pnpm (Package manager for Node.js - `npm install -g pnpm`)
- Python 3.8+ (or compatible version)
- pip (Python package installer)

### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Create a Python virtual environment:
    ```bash
    python3 -m venv venv
    ```

3.  Activate the virtual environment:
    - On macOS/Linux:
      ```bash
      source venv/bin/activate
      ```
    - On Windows:
      ```bash
      .\venv\Scripts\activate
      ```

4.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

5.  Run the Flask application:
    ```bash
    python app.py
    ```
    The backend server will start on `http://0.0.0.0:5000`.

### Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  **Important: Copy PDF.js Worker File**
    Before installing dependencies, ensure the `pdf.worker.min.js` file is in your `public` directory. If it's not there, copy it manually:
    ```bash
    cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
    ```
    (Note: If `cp` fails, you might need to adjust the source path based on your `node_modules` structure or manually locate and copy the file.)

3.  Install the Node.js dependencies using pnpm:
    ```bash
    pnpm install
    ```

4.  Run the Next.js development server:
    ```bash
    pnpm dev
    ```
    The frontend application will be accessible at `http://localhost:3000`.

## Usage

1.  Ensure both the backend (Flask) and frontend (Next.js) servers are running.
2.  Open your web browser and go to `http://localhost:3000`.
3.  Click on "Choose PDF File" to upload a PDF document.
4.  The PDF will be displayed in the left panel. You can navigate through pages using the "Previous" and "Next" buttons.
5.  Click "Convert to Markdown" to send the currently viewed page (or the entire document if no page is selected) to the backend for conversion. The resulting Markdown will appear in the right panel.

## Contributing

Feel free to fork this repository, open issues, or submit pull requests.

## License

This project is open-sourced under the MIT License.