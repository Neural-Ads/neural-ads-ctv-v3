"""
Real Data Loader for Neural Ads CTV Platform
Handles loading and processing of real fill rate, inventory, and advertiser preference data
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import os
from pathlib import Path
import logging
from datetime import datetime, timedelta
import json

class RealDataLoader:
    """
    Loads and processes real CTV advertising data including:
    - Fill rates by targeting dimensions
    - Inventory availability 
    - Advertiser preferences
    """
    
    def __init__(self, data_directory: str = None):
        """
        Initialize the data loader
        
        Args:
            data_directory: Path to directory containing the data files
        """
        if data_directory is None:
            # Default to the real data directory
            self.data_dir = Path(__file__).parent / "data" / "real_data"
        else:
            self.data_dir = Path(data_directory)
        
        self.fill_data = None
        self.avails_data = None
        self.preferences_data = None
        
        # Cache processed data
        self._processed_fill_rates = {}
        self._inventory_by_category = {}
        self._advertiser_preferences = {}
        
        self.logger = logging.getLogger(__name__)
        
    def load_all_data(self) -> bool:
        """Load all data files and return success status"""
        try:
            self.logger.info("🔄 Loading real CTV advertising data...")
            
            # Load fill rate data
            self.fill_data = self._load_fill_data()
            self.logger.info(f"✅ Loaded {len(self.fill_data)} fill rate records")
            
            # Load inventory availability data
            self.avails_data = self._load_avails_data()
            self.logger.info(f"✅ Loaded {len(self.avails_data)} inventory records")
            
            # Load advertiser preferences (if available)
            try:
                self.preferences_data = self._load_preferences_data()
                self.logger.info(f"✅ Loaded advertiser preferences data")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not load preferences data: {e}")
                self.preferences_data = pd.DataFrame()
            
            # Process and cache data
            self._process_fill_rates()
            self._process_inventory_data()
            
            self.logger.info("🎉 All real data loaded successfully!")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load data: {e}")
            return False
    
    def _load_fill_data(self) -> pd.DataFrame:
        """Load and validate fill rate data"""
        fill_path = self.data_dir / "day_fill.csv"
        
        if not fill_path.exists():
            raise FileNotFoundError(f"Fill data not found at {fill_path}")
        
        df = pd.read_csv(fill_path)
        
        # Validate required columns
        required_cols = ['field_combination', 'summary_value', 'request_count', 'fill_rate']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Parse field combinations
        df['targeting_type'] = df['field_combination'].str.split(':').str[0]
        df['targeting_value'] = df['field_combination'].str.split(':').str[1]
        
        return df
    
    def _load_avails_data(self) -> pd.DataFrame:
        """Load and validate inventory availability data"""
        avails_path = self.data_dir / "all_avails.csv"
        
        if not avails_path.exists():
            raise FileNotFoundError(f"Avails data not found at {avails_path}")
        
        df = pd.read_csv(avails_path)
        
        # Validate required columns
        required_cols = ['Category_Value', 'Count']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Parse categories (similar to fill data)
        df['targeting_type'] = df['Category_Value'].str.split(':').str[0]
        df['targeting_value'] = df['Category_Value'].str.split(':').str[1]
        
        # Handle summary row
        df = df[df['Category_Value'] != 'SUMMARY_TOTAL']
        
        return df
    
    def _load_preferences_data(self) -> pd.DataFrame:
        """Load advertiser preferences from parquet file"""
        prefs_path = self.data_dir / "resp.parquet"
        
        if not prefs_path.exists():
            self.logger.warning("Preferences parquet file not found, using empty dataset")
            return pd.DataFrame()
        
        try:
            df = pd.read_parquet(prefs_path)
            return df
        except Exception as e:
            self.logger.warning(f"Could not load parquet file: {e}")
            return pd.DataFrame()
    
    def _process_fill_rates(self):
        """Process fill rate data into usable format"""
        if self.fill_data is None:
            return
        
        # Group by targeting type for easy lookup
        for targeting_type in self.fill_data['targeting_type'].unique():
            type_data = self.fill_data[self.fill_data['targeting_type'] == targeting_type]
            
            self._processed_fill_rates[targeting_type] = {
                'avg_fill_rate': type_data['fill_rate'].mean(),
                'weighted_fill_rate': np.average(
                    type_data['fill_rate'], 
                    weights=type_data['request_count']
                ),
                'total_requests': type_data['request_count'].sum(),
                'records_count': len(type_data),
                'fill_rate_range': [
                    type_data['fill_rate'].min(),
                    type_data['fill_rate'].max()
                ],
                'by_value': dict(zip(
                    type_data['targeting_value'], 
                    type_data['fill_rate']
                ))
            }
    
    def _process_inventory_data(self):
        """Process inventory data into usable format"""
        if self.avails_data is None:
            return
        
        # Group by targeting type
        for targeting_type in self.avails_data['targeting_type'].unique():
            type_data = self.avails_data[self.avails_data['targeting_type'] == targeting_type]
            
            self._inventory_by_category[targeting_type] = {
                'total_inventory': type_data['Count'].sum(),
                'avg_per_value': type_data['Count'].mean(),
                'values_count': len(type_data),
                'inventory_range': [
                    type_data['Count'].min(),
                    type_data['Count'].max()
                ],
                'by_value': dict(zip(
                    type_data['targeting_value'], 
                    type_data['Count']
                ))
            }
    
    def get_fill_rate_for_targeting(self, targeting_type: str, targeting_value: str = None) -> float:
        """
        Get fill rate for specific targeting criteria
        
        Args:
            targeting_type: Type of targeting (e.g., 'network', 'zip')
            targeting_value: Specific value (e.g., 'accuweather', '90210')
        
        Returns:
            Fill rate as decimal (0.0 to 1.0)
        """
        if targeting_type not in self._processed_fill_rates:
            # Return overall average if type not found
            return self.get_overall_fill_rate()
        
        type_data = self._processed_fill_rates[targeting_type]
        
        if targeting_value and targeting_value in type_data['by_value']:
            return type_data['by_value'][targeting_value]
        else:
            # Return weighted average for the targeting type
            return type_data['weighted_fill_rate']
    
    def get_inventory_for_targeting(self, targeting_type: str, targeting_value: str = None) -> int:
        """
        Get available inventory for specific targeting criteria
        
        Args:
            targeting_type: Type of targeting (e.g., 'network', 'zip')
            targeting_value: Specific value (e.g., 'accuweather', '90210')
        
        Returns:
            Available inventory count
        """
        if targeting_type not in self._inventory_by_category:
            # Return proportional share of total if type not found
            return int(self.get_total_inventory() * 0.01)  # 1% as fallback
        
        type_data = self._inventory_by_category[targeting_type]
        
        if targeting_value and targeting_value in type_data['by_value']:
            return type_data['by_value'][targeting_value]
        else:
            # Return average inventory for the targeting type
            return int(type_data['avg_per_value'])
    
    def get_overall_fill_rate(self) -> float:
        """Get overall weighted fill rate across all targeting"""
        if self.fill_data is None:
            return 0.12  # Fallback to 12%
        
        return np.average(
            self.fill_data['fill_rate'], 
            weights=self.fill_data['request_count']
        )
    
    def get_total_inventory(self) -> int:
        """Get total available inventory across all categories"""
        if self.avails_data is None:
            return 1000000000  # 1B fallback
        
        return int(self.avails_data['Count'].sum())
    
    def get_targeting_options(self) -> Dict[str, List[str]]:
        """Get all available targeting options"""
        options = {}
        
        if self.fill_data is not None:
            for targeting_type in self.fill_data['targeting_type'].unique():
                type_data = self.fill_data[self.fill_data['targeting_type'] == targeting_type]
                options[targeting_type] = sorted(type_data['targeting_value'].unique().tolist())
        
        return options
    
    def get_forecasting_data_for_campaign(self, 
                                        targeting_criteria: Dict[str, List[str]], 
                                        budget: float,
                                        timeline_weeks: int = 4) -> Dict[str, Any]:
        """
        Generate forecasting data based on real fill rates and inventory
        
        Args:
            targeting_criteria: Dict of targeting types and their values
            budget: Campaign budget
            timeline_weeks: Campaign duration in weeks
        
        Returns:
            Forecasting data structure for use by ForecastingAgent
        """
        # Calculate combined fill rate based on targeting
        combined_fill_rate = self._calculate_combined_fill_rate(targeting_criteria)
        
        # Calculate available inventory
        available_inventory = self._calculate_available_inventory(targeting_criteria)
        
        # Estimate CPM based on targeting selectivity
        estimated_cpm = self._estimate_cpm(targeting_criteria)
        
        return {
            'fill_rate_estimate': combined_fill_rate,
            'available_inventory_mm': available_inventory / 1_000_000,
            'estimated_cpm': estimated_cpm,
            'confidence_score': self._calculate_confidence(targeting_criteria),
            'weekly_distribution': self._distribute_inventory_weekly(
                available_inventory, timeline_weeks
            ),
            'targeting_breakdown': {
                target_type: {
                    'fill_rate': self.get_fill_rate_for_targeting(target_type),
                    'inventory': self.get_inventory_for_targeting(target_type)
                }
                for target_type in targeting_criteria.keys()
            }
        }
    
    def _calculate_combined_fill_rate(self, targeting_criteria: Dict[str, List[str]]) -> float:
        """Calculate combined fill rate for multiple targeting criteria"""
        if not targeting_criteria:
            return self.get_overall_fill_rate()
        
        # Weight fill rates by specificity (more specific = lower fill rate)
        fill_rates = []
        weights = []
        
        for target_type, values in targeting_criteria.items():
            if values:  # If specific values are targeted
                avg_fill_rate = np.mean([
                    self.get_fill_rate_for_targeting(target_type, value) 
                    for value in values
                ])
                fill_rates.append(avg_fill_rate)
                weights.append(len(values))  # More values = higher weight
            else:
                fill_rates.append(self.get_fill_rate_for_targeting(target_type))
                weights.append(1)
        
        if not fill_rates:
            return self.get_overall_fill_rate()
        
        return np.average(fill_rates, weights=weights)
    
    def _calculate_available_inventory(self, targeting_criteria: Dict[str, List[str]]) -> int:
        """Calculate available inventory for targeting criteria"""
        if not targeting_criteria:
            return self.get_total_inventory()
        
        # Use most restrictive targeting as the limiting factor
        min_inventory = float('inf')
        
        for target_type, values in targeting_criteria.items():
            if values:
                total_for_type = sum([
                    self.get_inventory_for_targeting(target_type, value) 
                    for value in values
                ])
            else:
                total_for_type = self._inventory_by_category.get(
                    target_type, {}
                ).get('total_inventory', self.get_total_inventory())
            
            min_inventory = min(min_inventory, total_for_type)
        
        return int(min_inventory) if min_inventory != float('inf') else self.get_total_inventory()
    
    def _estimate_cpm(self, targeting_criteria: Dict[str, List[str]]) -> float:
        """Estimate CPM based on targeting selectivity"""
        base_cpm = 12.0  # Base CPM
        
        # Increase CPM for more selective targeting
        selectivity_multiplier = 1.0
        
        for target_type, values in targeting_criteria.items():
            if target_type == 'network' and values:
                selectivity_multiplier *= 1.2  # Premium networks
            elif target_type == 'zip' and values:
                selectivity_multiplier *= 1.1  # Geo-specific
            elif target_type in ['genre', 'content'] and values:
                selectivity_multiplier *= 1.15  # Content-specific
        
        return base_cpm * selectivity_multiplier
    
    def _calculate_confidence(self, targeting_criteria: Dict[str, List[str]]) -> float:
        """Calculate confidence score based on data availability"""
        if not targeting_criteria:
            return 0.85  # High confidence for broad targeting
        
        confidence_scores = []
        
        for target_type, values in targeting_criteria.items():
            if target_type in self._processed_fill_rates:
                type_data = self._processed_fill_rates[target_type]
                # Higher confidence for more data points
                confidence = min(0.95, 0.5 + (type_data['records_count'] / 1000))
                confidence_scores.append(confidence)
            else:
                confidence_scores.append(0.6)  # Lower confidence for unknown types
        
        return np.mean(confidence_scores) if confidence_scores else 0.75
    
    def _distribute_inventory_weekly(self, total_inventory: int, weeks: int) -> List[float]:
        """Distribute inventory across weeks with realistic patterns"""
        # Simulate weekly variation (some weeks have more inventory)
        weekly_multipliers = []
        for week in range(weeks):
            # Slight random variation around 1.0
            multiplier = 0.85 + (week % 2) * 0.3 + np.random.uniform(-0.1, 0.1)
            weekly_multipliers.append(max(0.5, min(1.5, multiplier)))
        
        # Normalize to ensure total equals expected
        total_multiplier = sum(weekly_multipliers)
        normalized_multipliers = [m / total_multiplier for m in weekly_multipliers]
        
        return [total_inventory * mult / 1_000_000 for mult in normalized_multipliers]  # Return in millions
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of loaded data for debugging/monitoring"""
        summary = {
            'data_loaded': self.fill_data is not None and self.avails_data is not None,
            'load_timestamp': datetime.now().isoformat(),
        }
        
        if self.fill_data is not None:
            summary['fill_data'] = {
                'total_records': len(self.fill_data),
                'targeting_types': self.fill_data['targeting_type'].nunique(),
                'overall_fill_rate': f"{self.get_overall_fill_rate():.1%}",
                'date_range': 'Real historical data'
            }
        
        if self.avails_data is not None:
            summary['inventory_data'] = {
                'total_records': len(self.avails_data),
                'total_inventory': f"{self.get_total_inventory():,}",
                'targeting_categories': self.avails_data['targeting_type'].nunique()
            }
        
        if not self.preferences_data.empty:
            summary['preferences_data'] = {
                'records': len(self.preferences_data),
                'columns': list(self.preferences_data.columns)
            }
        
        return summary


# Global instance for use across the application
_real_data_loader = None

def get_real_data_loader() -> RealDataLoader:
    """Get singleton instance of the real data loader"""
    global _real_data_loader
    if _real_data_loader is None:
        _real_data_loader = RealDataLoader()
        _real_data_loader.load_all_data()
    return _real_data_loader

def initialize_real_data(data_directory: str = None) -> bool:
    """Initialize the real data loader with custom directory"""
    global _real_data_loader
    _real_data_loader = RealDataLoader(data_directory)
    return _real_data_loader.load_all_data()
