import threading
import logging
import sys
import os
import webbrowser
import requests

# Force PyInstaller bundle
import requests
import flask
import flask_cors
import dotenv
import psutil
import PIL

from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QLineEdit, QPushButton, 
                             QFileDialog, QMessageBox, QStyle)
from PySide6.QtCore import Qt
from PySide6 import QtGui

# Setup GUI Debug Logging
logging.basicConfig(
    filename='nas_gui_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

def run_nas_server(root, password, port):
    # This function runs the Flask server in a separate thread.
    try:
        # Import the app and the init function inside the thread
        from nas.unified_nexus import app, init_app
        init_app(root, password, port)
        app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
    except Exception as e:
        try:
            with open('nas_server_crash.log', 'a', encoding='utf-8') as f:
                f.write('SERVER CRASHED: ' + str(e) + '\\n')
        except:
            pass

class NasGui(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("J.NAS Server Controller")
        self.setFixedSize(500, 300)
        
        # Use a generic system icon
        self.setWindowIcon(self.style().standardIcon(QStyle.SP_ComputerIcon))

        self.server_thread = None
        self.current_port = None

        # Main Widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # Root Directory Row
        root_layout = QHBoxLayout()
        self.root_label = QLabel("Root Directory:")
        self.root_input = QLineEdit()
        self.root_input.setText("/home/jerry/workspace/nas_tool/nas") 
        self.browse_btn = QPushButton("Browse")
        self.browse_btn.clicked.connect(self.browse_folder)
        root_layout.addWidget(self.root_label)
        root_layout.addWidget(self.root_input)
        root_layout.addWidget(self.browse_btn)
        layout.addLayout(root_layout)

        # Password Row
        pass_layout = QHBoxLayout()
        self.pass_label = QLabel("NAS Password:")
        self.pass_input = QLineEdit()
        self.pass_input.setEchoMode(QLineEdit.Password)
        self.pass_input.setText("JERRY_NEXUS_2026")
        pass_layout.addWidget(self.pass_label)
        pass_layout.addWidget(self.pass_input)
        layout.addLayout(pass_layout)

        # Port Row
        port_layout = QHBoxLayout()
        self.port_label = QLabel("Server Port:")
        self.port_input = QLineEdit()
        self.port_input.setText("8000")
        port_layout.addWidget(self.port_label)
        port_layout.addWidget(self.port_input)
        layout.addLayout(port_layout)

        # Control Buttons
        btn_layout = QHBoxLayout()
        self.start_btn = QPushButton("Start Server")
        self.start_btn.setStyleSheet("background-color: #2ecc71; color: white; font-weight: bold; height: 40px;")
        self.start_btn.clicked.connect(self.start_server)
        
        self.stop_btn = QPushButton("Stop Server")
        self.stop_btn.setStyleSheet("background-color: #e74c3c; color: white; font-weight: bold; height: 40px;")
        self.stop_btn.clicked.connect(self.stop_server)
        self.stop_btn.setEnabled(False)

        btn_layout.addWidget(self.start_btn)
        btn_layout.addWidget(self.stop_btn)
        layout.addLayout(btn_layout)

        # Browser Button
        self.open_browser_btn = QPushButton("Open NAS Interface")
        self.open_browser_btn.setStyleSheet("height: 30px;")
        self.open_browser_btn.clicked.connect(self.open_browser)
        layout.addWidget(self.open_browser_btn)

        # Status Bar
        self.status_label = QLabel("Status: Stopped")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)

    def browse_folder(self):
        dir_path = QFileDialog.getExistingDirectory(self, "Select NAS Root Directory")
        if dir_path:
            self.root_input.setText(dir_path)

    def start_server(self):
        root = self.root_input.text().strip()
        password = self.pass_input.text().strip()
        port_str = self.port_input.text().strip()

        if not root or not password or not port_str.isdigit():
            QMessageBox.warning(self, "Error", "Please specify valid root, password, and numeric port.")
            return

        port = int(port_str)
        self.current_port = port

        try:
            logging.debug(f"Attempting to start server: root={root}, port={port}")
            
            # Launch server in a daemon thread
            self.server_thread = threading.Thread(
                target=run_nas_server, 
                args=(root, password, port),
                daemon=True
            )
            self.server_thread.start()
            
            # Update UI Status
            self.status_label.setText(f"Status: Running (Port {port})")
            self.start_btn.setEnabled(False)
            self.stop_btn.setEnabled(True)
            self.root_input.setEnabled(False)
            self.pass_input.setEnabled(False)
            self.port_input.setEnabled(False)
            logging.info(f"Server thread started (Port {port})")

        except Exception as e:
            logging.error(f"Failed to start server: {str(e)}")
            QMessageBox.critical(self, "Execution Error", f"Failed to start server: {str(e)}")

    def stop_server(self):
        if self.current_port:
            logging.debug(f"Requesting server shutdown on port {self.current_port}")
            try:
                # Call the shutdown API to kill the server process
                requests.post(f"http://localhost:{self.current_port}/nas/api/shutdown", timeout=2)
            except Exception as e:
                logging.error(f"Shutdown request failed: {str(e)}")
        
        # Reset UI Status
        self.status_label.setText("Status: Stopped")
        self.start_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.root_input.setEnabled(True)
        self.pass_input.setEnabled(True)
        self.port_input.setEnabled(True)
        self.current_port = None

    def open_browser(self):
        port = self.port_input.text().strip()
        if not port.isdigit():
            QMessageBox.warning(self, "Error", "Please enter a valid port before opening the browser.")
            return
        webbrowser.open(f"http://localhost:{port}/nas/")

if __name__ == "__main__":
    # CRITICAL for PyInstaller bundled apps
    multiprocessing.freeze_support()
    
    app = QApplication(sys.argv)
    window = NasGui()
    window.show()
    sys.exit(app.exec())
