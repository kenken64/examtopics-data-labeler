# AWS Certification Web Application

This project has evolved into a comprehensive web application designed to assist with AWS certification preparation and management. It features a PDF data labeler, robust user authentication, and various management interfaces for certificates, payees, and question assignments.

## Features

### Core Functionality

- **PDF Data Labeler**: Upload PDF documents, view them page by page, convert content to Markdown, and label specific sections (questions, answers, explanations) for quiz creation.
- **User Authentication**: Secure user registration and login using Passkeys (WebAuthn) with JWT for session management.
- **Role-Based Access**: Protected routes ensure only authenticated users can access certain parts of the application.

### Management Interfaces

- **Certificate Management**: CRUD operations for AWS certification types (e.g., SAA-C03, DVA-C02).
- **Payee Management**: Manage customer payment records, including credit card details (masked), payment status, and associated certificates.
- **Access Code Management**: Generate unique access codes for paid customers, linking them to specific certificates.
- **Question Assignment Management**: Assign and reorder specific questions from quizzes to generated access codes, allowing for customized quiz experiences per customer. Questions can be enabled/disabled for an access code.
- **Saved Questions Viewer**: Browse questions by certificate code or search by access code (original or generated) to view question details, options, and explanations.

## Technologies Used

### Backend (Python - PDF Conversion Service)

- **Flask**: A micro web framework for Python.
- **docling**: A library for document processing and conversion.
- **pypdf**: A pure-Python PDF library.
- **Flask-Cors**: For handling Cross Origin Resource Sharing (CORS).

### Frontend (Next.js - Main Application)

- **Next.js**: A React framework for building production-ready web applications.
- **React**: A JavaScript library for building user interfaces.
- **MongoDB / Mongoose**: For database interactions and schema modeling.
- **jsonwebtoken**: For creating and verifying JSON Web Tokens.
- **@simplewebauthn/server & @simplewebauthn/browser**: For implementing FIDO2 (Passkey) authentication.
- **shadcn/ui**: A collection of re-usable components built using Radix UI and Tailwind CSS for a modern UI.
- **Tailwind CSS**: A utility-first CSS framework.
- **pdfjs-dist**: A PDF rendering library from Mozilla.

## Setup and Installation

Follow these steps to set up and run the project locally.

### Prerequisites

- Node.js (LTS version recommended)
- pnpm (Package manager for Node.js - `npm install -g pnpm`)
- Python 3.8+ (or compatible version)
- pip (Python package installer)
- MongoDB instance (local or cloud-hosted)

### 1. Backend Setup (PDF Conversion Service)

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

### 2. Frontend Setup (Next.js Application)

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  **Environment Variables**: Create a `.env.local` file in the `frontend` directory and add the following:

    ```
    MONGODB_URI=your_mongodb_connection_string
    RP_ID=localhost # Or your domain (e.g., your-app.com)
    RP_NAME="AWS Cert Web" # Your application name
    ORIGIN=http://localhost:3000 # Your application's origin
    JWT_SECRET=your_super_secret_jwt_key # Generate a strong, random key
    NEXT_PUBLIC_PDF_CONVERSION_API_URL=http://localhost:5000 # URL of your Python backend
    ```
    *Replace placeholders with your actual values.*

3.  **Important: Copy PDF.js Worker File**
    Before installing dependencies, ensure the `pdf.worker.min.js` file is in your `public` directory. If it's not there, copy it manually:
    ```bash
    cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
    ```
    (Note: If `cp` fails, you might need to adjust the source path based on your `node_modules` structure or manually locate and copy the file.)

4.  Install Node.js dependencies:
    ```bash
    pnpm install
    ```

5.  **Initialize shadcn/ui**: Run the shadcn/ui initialization command. Follow the prompts, selecting `Default` style and `Slate` as the base color.
    ```bash
    npx shadcn@latest init
    ```

6.  **Add shadcn/ui Components**: Add the necessary UI components.
    ```bash
    npx shadcn@latest add button input label avatar badge card select separator sheet
    ```

7.  **Seed Database (Optional but Recommended)**: Populate your MongoDB with sample data for certificates, payees, and question assignments.
    ```bash
    node seed-certificates.js
    node seed-payees.js
    node seed-access-code-questions.js
    ```

8.  Run the Next.js development server:
    ```bash
    pnpm dev
    ```
    The frontend application will be accessible at `http://localhost:3000`.

## Usage

1.  Ensure both the backend (Flask) and frontend (Next.js) servers are running.
2.  Open your web browser and go to `http://localhost:3000`.
3.  **Login/Register**: You will be greeted by the login page. You can register a new user using a passkey.
4.  **Navigation**: After successful login, you will be redirected to the dashboard. Use the sliding menu (accessible from the top-left corner) to navigate to different sections:
    -   **Home**: The PDF Data Labeler interface.
    -   **Certificates**: Manage certification types.
    -   **Payees**: Manage customer payment records.
    -   **Access Codes**: Generate and view access codes for paid customers.
    -   **Manage Questions**: Assign and reorder questions for specific generated access codes.
    -   **Saved Questions**: Search and view questions by access code or certificate.

## Important Notes

-   **Passkey Challenge Storage**: The current implementation uses a global variable for storing WebAuthn challenges (`currentChallenge`). **This is for demonstration purposes only and is highly insecure.** In a production environment, you must implement a secure server-side session management system (e.g., using a database, Redis, or a dedicated session library) to store and retrieve challenges.
-   **PDF Conversion API**: The `NEXT_PUBLIC_PDF_CONVERSION_API_URL` environment variable in the frontend points to your Python Flask backend. Ensure this URL is correct.
-   **Data Transformation**: The application includes utilities (`frontend/app/utils/questionTransform.ts`) to handle transformations between different question data formats from the database to the frontend.

## Contributing

Feel free to fork this repository, open issues, or submit pull requests.

## License

This project is open-sourced under the MIT License.
