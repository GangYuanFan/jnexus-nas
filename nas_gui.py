import sys
import os
import subprocess
import webbrowser
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QLineEdit, QPushButton, 
                             QFileDialog, QMessageBox)
from PySide6.QtCore import Qt, QProcess

class NasGui(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("J.NAS Server Controller")
        self.setFixedSize(500, 250)
        self.process = None

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
        # Set default root based on current workspace for convenience
        self.root_input.setText("/home/jerry/workspace/nas") 
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

        if not root or not password:
            QMessageBox.warning(self, "Error", "Please specify both root directory and password.")
            return

        try:
            # Find the path to unified_nexus.py
            # In packaged mode, we need to handle the internal path
            if getattr(sys, 'frozen', False):
                # Running as bundled .exe
                base_path = sys._MEIPASS
                script_path = os.path.join(base_path, 'nas', 'unified_nexus.py')
            else:
                # Running as .py script
                script_path = os.path.join(os.path.dirname(__file__), 'nas', 'unified_nexus.py')

            # Command to run the server
            cmd = [
                'python', script_path,
                '--root', root,
                '--password', password
            ]

            # Using QProcess for better control over the background server
            self.process = QProcess()
            self.process.setProcessChannelMode(QProcess.MergedChannels)
            self.process.started.connect(self.on_server_started)
            self.process.finished.connect(self.on_server_stopped)
            
            # Start the process
            self.process.start('python', [script_path, '--root', root, '--password', password])
            
        except Exception as e:
            QMessageBox.critical(self, "Execution Error", f"Failed to start server: {str(e)}")

    def on_server_started(self):
        self.status_label.setText("Status: Running (Port 8000)")
        self.start_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)
        self.root_input.setEnabled(False)
        self.pass_input.setEnabled(False)

    def on_server_stopped(self):
        self.status_label.setText("Status: Stopped")
        self.start_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.root_input.setEnabled(True)
        self.pass_input.setEnabled(True)

    def stop_server(self):
        if self.process:
            self.process.terminate()
            self.process.kill()

    def open_browser(self):
        webbrowser.open("http://localhost:8000/nas/")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = NasGui()
    window.show()
    sys.exit(app.exec())
