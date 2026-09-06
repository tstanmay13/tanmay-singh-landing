"use client";

import { useState, FormEvent } from "react";
import ScrollReveal from "@/components/ScrollReveal";

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const socialLinks = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/tstanmay13",
  },
  {
    id: "twitter",
    label: "Twitter / X",
    href: "https://twitter.com/tstanmay13",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/in/tsingh13",
  },
  {
    id: "email",
    label: "Email",
    href: "mailto:contact@tanmay-singh.com",
  },
];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) {
    errors.name = "Name is required";
  }
  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!validateEmail(data.email)) {
    errors.email = "Invalid email format";
  }
  if (!data.message.trim()) {
    errors.message = "Message is required";
  }
  return errors;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const subject = encodeURIComponent(`Hi from ${formData.name.trim()}`);
    const body = encodeURIComponent(
      `${formData.message.trim()}\n\n— ${formData.name.trim()}\n${formData.email.trim()}`,
    );
    window.location.href = `mailto:contact@tanmay-singh.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h1
              className="pixel-text text-3xl sm:text-5xl mb-4"
              style={{ color: "var(--color-accent)" }}
            >
              CONTACT
            </h1>
            <p
              className="mono-text text-lg sm:text-xl"
              style={{ color: "var(--color-text-secondary)" }}
            >
              I&apos;m in New York. Email is easiest.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mb-20">
            <div
              className="pixel-border p-6 sm:p-8"
              style={{
                background: "var(--color-bg-card)",
                maxWidth: "640px",
                margin: "0 auto",
              }}
            >
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-5">
                  <label
                    htmlFor="contact-name"
                    className="pixel-text text-[10px] sm:text-xs block mb-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full px-4 py-3 mono-text text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: `2px solid ${errors.name ? "var(--color-red)" : "var(--color-border)"}`,
                      color: "var(--color-text)",
                    }}
                    placeholder="Your name"
                  />
                  {errors.name && (
                    <p
                      className="pixel-text text-[9px] mt-1"
                      style={{ color: "var(--color-red)" }}
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="contact-email"
                    className="pixel-text text-[10px] sm:text-xs block mb-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full px-4 py-3 mono-text text-sm outline-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: `2px solid ${errors.email ? "var(--color-red)" : "var(--color-border)"}`,
                      color: "var(--color-text)",
                    }}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p
                      className="pixel-text text-[9px] mt-1"
                      style={{ color: "var(--color-red)" }}
                    >
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="contact-message"
                    className="pixel-text text-[10px] sm:text-xs block mb-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 mono-text text-sm outline-none resize-none"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: `2px solid ${errors.message ? "var(--color-red)" : "var(--color-border)"}`,
                      color: "var(--color-text)",
                    }}
                    placeholder="What do you want to talk about?"
                  />
                  {errors.message && (
                    <p
                      className="pixel-text text-[9px] mt-1"
                      style={{ color: "var(--color-red)" }}
                    >
                      {errors.message}
                    </p>
                  )}
                </div>

                <button type="submit" className="pixel-btn w-full">
                  Send
                </button>
                <p
                  className="mono-text text-xs mt-3 text-center"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Opens your mail app to contact@tanmay-singh.com
                </p>
              </form>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mb-16">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.id === "email" ? undefined : "_blank"}
                  rel={link.id === "email" ? undefined : "noopener noreferrer"}
                  className="pixel-card p-5 text-center block"
                >
                  <span
                    className="pixel-text text-[9px] sm:text-[10px]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {link.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
