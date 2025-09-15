
import numpy as np
import pandas as pd

def calculate_metrics(data):
    """Calculate statistical metrics"""
    return {
        'mean': np.mean(data),
        'std': np.std(data)
    }

class DataProcessor:
    def __init__(self, config):
        self.config = config

    def process(self, df):
        return df.dropna()
      