package com.example;

public class Calculator {
    private int result;

    public Calculator() {
        this.result = 0;
    }

    public int add(int a, int b) {
        result = a + b;
        return result;
    }

    public int subtract(int a, int b) {
        result = a - b;
        return result;
    }

    public int multiply(int a, int b) {
        result = a * b;
        return result;
    }

    public double divide(int a, int b) throws ArithmeticException {
        if (b == 0) {
            throw new ArithmeticException("Division by zero");
        }
        result = a / b;
        return result;
    }

    public int getResult() {
        return result;
    }

    public void reset() {
        result = 0;
    }
}