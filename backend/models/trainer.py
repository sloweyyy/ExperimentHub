import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import time
import json
import os
from pathlib import Path
import traceback

# Set the default device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def get_data_loaders(batch_size=64):
    """Get MNIST training and test data loaders."""
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    # Download and load the MNIST training data
    train_dataset = datasets.MNIST('data', train=True, download=True, transform=transform)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    
    # Download and load the MNIST test data
    test_dataset = datasets.MNIST('data', train=False, transform=transform)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, test_loader

def train_epoch(model, train_loader, optimizer, epoch, job_id, status_callback):
    """Train the model for one epoch."""
    model.train()
    train_loss = 0
    correct = 0
    total = 0
    start_time = time.time()
    
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = nn.functional.nll_loss(output, target)
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item()
        pred = output.argmax(dim=1, keepdim=True)
        correct += pred.eq(target.view_as(pred)).sum().item()
        total += target.size(0)
        
        if batch_idx % 100 == 0:
            current_batch = batch_idx * len(data)
            total_batches = len(train_loader.dataset)
            progress = 100. * batch_idx / len(train_loader)
            avg_loss = train_loss / (batch_idx + 1)
            accuracy = 100. * correct / total
            
            status = {
                "job_id": job_id,
                "epoch": epoch,
                "train_loss": avg_loss,
                "train_accuracy": accuracy,
                "progress": progress,
                "batch": f"{current_batch}/{total_batches}",
                "time": time.time() - start_time
            }
            
            if status_callback:
                status_callback(status)
    
    epoch_loss = train_loss / len(train_loader)
    epoch_accuracy = 100. * correct / total
    epoch_time = time.time() - start_time
    
    return {
        "loss": epoch_loss,
        "accuracy": epoch_accuracy,
        "time": epoch_time
    }

def validate(model, test_loader):
    """Validate the model on the test set."""
    model.eval()
    test_loss = 0
    correct = 0
    start_time = time.time()
    
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += nn.functional.nll_loss(output, target, reduction='sum').item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()
    
    test_loss /= len(test_loader.dataset)
    accuracy = 100. * correct / len(test_loader.dataset)
    validation_time = time.time() - start_time
    
    return {
        "loss": test_loss,
        "accuracy": accuracy,
        "time": validation_time
    }

def train_model(model, job_id, config, status_callback=None):
    """
    Train the model using the given configuration.
    
    Args:
        model: The PyTorch model to train
        job_id: Unique ID for this training job
        config: Dictionary with training configuration
        status_callback: Callback function to report progress
    
    Returns:
        Dictionary with training results
    """
    try:
        # Extract hyperparameters from config
        epochs = config.get('epochs', 5)
        batch_size = config.get('batch_size', 64)
        learning_rate = config.get('learning_rate', 0.01)
        optimizer_name = config.get('optimizer', 'sgd')
        
        # Move model to the device
        model = model.to(device)
        
        # Create data loaders
        train_loader, test_loader = get_data_loaders(batch_size)
        
        # Setup optimizer
        if optimizer_name.lower() == 'adam':
            optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        else:
            optimizer = optim.SGD(model.parameters(), lr=learning_rate, 
                                  momentum=config.get('momentum', 0.5))
        
        # Setup scheduler if needed
        if config.get('use_scheduler', False):
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='min', factor=0.1, patience=2)
        else:
            scheduler = None
        
        # Training history
        history = {
            'train_loss': [],
            'train_accuracy': [],
            'val_loss': [],
            'val_accuracy': [],
            'epoch_times': []
        }
        
        # Keep track of best validation accuracy
        best_accuracy = 0
        best_model_path = f"models/{job_id}_best_model.pt"
        
        # Ensure directory exists
        os.makedirs("models", exist_ok=True)
        
        # Training loop
        total_start_time = time.time()
        for epoch in range(1, epochs + 1):
            # Train epoch
            epoch_results = train_epoch(
                model, train_loader, optimizer, epoch, job_id, status_callback)
            
            # Validate
            val_results = validate(model, test_loader)
            
            # Save results to history
            history['train_loss'].append(epoch_results['loss'])
            history['train_accuracy'].append(epoch_results['accuracy'])
            history['val_loss'].append(val_results['loss'])
            history['val_accuracy'].append(val_results['accuracy'])
            history['epoch_times'].append(epoch_results['time'])
            
            # Update scheduler if needed
            if scheduler:
                scheduler.step(val_results['loss'])
            
            # Save best model
            if val_results['accuracy'] > best_accuracy:
                best_accuracy = val_results['accuracy']
                torch.save(model.state_dict(), best_model_path)
            
            # Report progress
            epoch_status = {
                "job_id": job_id,
                "epoch": epoch,
                "epochs_total": epochs,
                "train_loss": epoch_results['loss'],
                "train_accuracy": epoch_results['accuracy'],
                "val_loss": val_results['loss'],
                "val_accuracy": val_results['accuracy'],
                "epoch_time": epoch_results['time'],
                "status": "running"
            }
            
            if status_callback:
                status_callback(epoch_status)
        
        total_training_time = time.time() - total_start_time
        
        # Final results
        final_results = {
            "job_id": job_id,
            "config": config,
            "history": history,
            "best_accuracy": best_accuracy,
            "best_model_path": best_model_path,
            "total_time": total_training_time,
            "status": "completed"
        }
        
        # Final callback
        if status_callback:
            status_callback({**epoch_status, "status": "completed", "final_results": final_results})
        
        return final_results
    
    except Exception as e:
        error_info = {
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        
        if status_callback:
            status_callback(error_info)
        
        return error_info 