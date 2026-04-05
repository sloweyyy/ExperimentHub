"""Tests for model instantiation and output shapes."""

import pytest
import torch
from models.mnist_model import create_model


@pytest.mark.unit
class TestModelCreation:
    def test_create_cnn(self):
        model = create_model("cnn")
        x = torch.randn(1, 1, 28, 28)
        output = model(x)
        assert output.shape == (1, 10)

    def test_create_mlp(self):
        model = create_model("mlp")
        x = torch.randn(1, 1, 28, 28)
        output = model(x)
        assert output.shape == (1, 10)

    def test_create_rnn(self):
        model = create_model("rnn")
        x = torch.randn(1, 1, 28, 28)
        output = model(x)
        assert output.shape == (1, 10)

    def test_create_invalid_model_raises(self):
        with pytest.raises(ValueError, match="not supported"):
            create_model("invalid")

    def test_cnn_custom_params(self):
        # kernel_size stays at default 3 because SimpleCNN hardcodes the
        # fc1 input size for 3x3 kernels (64*5*5).
        model = create_model("cnn", hidden_size=64, dropout_rate=0.3, kernel_size=3)
        x = torch.randn(1, 1, 28, 28)
        output = model(x)
        assert output.shape == (1, 10)

    def test_mlp_custom_layers(self):
        model = create_model("mlp", hidden_size=256, num_layers=3, dropout_rate=0.1)
        x = torch.randn(1, 1, 28, 28)
        output = model(x)
        assert output.shape == (1, 10)
