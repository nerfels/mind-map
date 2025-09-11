# Test Python file for AST parsing
import os
import json
from datetime import datetime
from typing import List, Optional

import flask
from flask import Flask, request, jsonify
import pandas as pd
import numpy as np


class UserService:
    """Service for managing user operations"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.users = []
    
    @property
    def user_count(self) -> int:
        """Get the total number of users"""
        return len(self.users)
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        return "@" in email and "." in email.split("@")[1]
    
    async def create_user(self, name: str, email: str) -> Optional[dict]:
        """Create a new user asynchronously"""
        if not self.validate_email(email):
            return None
        
        user = {
            'id': len(self.users) + 1,
            'name': name,
            'email': email,
            'created_at': datetime.now()
        }
        self.users.append(user)
        return user
    
    def get_users_by_domain(self, domain: str) -> List[dict]:
        """Get all users from a specific email domain"""
        return [user for user in self.users if user['email'].endswith(domain)]


def process_data(data_frame: pd.DataFrame) -> pd.DataFrame:
    """Process pandas dataframe with numpy operations"""
    return data_frame.fillna(0).apply(lambda x: np.sqrt(x) if x >= 0 else 0)


@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now()})


# Flask app initialization
app = Flask(__name__)
user_service = UserService(os.getenv('DATABASE_URL', 'sqlite:///users.db'))


@app.route('/users', methods=['POST'])
async def create_user_endpoint():
    """Create user endpoint"""
    data = request.json
    user = await user_service.create_user(data['name'], data['email'])
    
    if user:
        return jsonify(user), 201
    else:
        return jsonify({'error': 'Invalid email'}), 400


if __name__ == '__main__':
    app.run(debug=True)