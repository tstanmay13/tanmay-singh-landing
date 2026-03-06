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

interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: string;
  color: string;
}

const socialLinks: SocialLink[] = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/tstanmay13",
    icon: "{ }",
    color: "var(--color-accent)",
  },
  {
    id: "twitter",
    label: "Twitter/X",
    href: "https://twitter.com/tanmaysingh",
    icon: "X",
    color: "var(--color-cyan)",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/in/tanmaysingh",
    icon: "in",
    color: "var(--color-blue)",
  },
  {
    id: "email",
    label: "Email",
    href: "mailto:contact@tanmay-singh.com",
    icon: "@",
    color: "var(--color-orange)",
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
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleChange = (
    field: keyof FormData,
    value: string
  ) => {
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
    setSending(true);
    // Simulate sending delay
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 1500);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({ name: "", email: "", message: "" });
    setErrors({});
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
              Let&apos;s Build Something Together
            </p>
            <div
              className="mt-4 mx-auto"
              style={{
                width: "80px",
                height: "3px",
                background: "var(--color-accent)",
              }}
            />
          </div>
        </ScrollReveal>

        {/* Contact Form - Retro Terminal */}
        <ScrollReveal delay={100}>
          <div className="mb-20">
            <div
              className="pixel-border"
              style={{
                background: "var(--color-bg-card)",
                maxWidth: "640px",
                margin: "0 auto",
              }}
            >
              {/* Title Bar */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "2px solid var(--color-border)",
                }}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: "var(--color-red)" }}
                />
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: "var(--color-orange)" }}
                />
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
                <span
                  className="pixel-text text-[10px] sm:text-xs ml-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  NEW_MESSAGE.exe
                </span>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-8">
                {submitted ? (
                  /* Success Screen */
                  <div className="text-center py-8 animate-scale-in">
                    <div
                      className="text-6xl mb-6 animate-pixel-bounce"
                      style={{
                        display: "inline-block",
                        textShadow: "0 0 20px var(--color-accent-glow)",
                      }}
                    >
                      <svg
                        width="80"
                        height="80"
                        viewBox="0 0 16 16"
                        style={{
                          imageRendering: "pixelated",
                          display: "block",
                          margin: "0 auto",
                        }}
                      >
                        <rect x="1" y="1" width="14" height="14" fill="none" stroke="var(--color-accent)" strokeWidth="1" />
                        <rect x="3" y="8" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="4" y="9" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="5" y="10" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="6" y="9" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="7" y="8" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="8" y="7" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="9" y="6" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="10" y="5" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="11" y="4" width="1" height="1" fill="var(--color-accent)" />
                        <rect x="12" y="3" width="1" height="1" fill="var(--color-accent)" />
                      </svg>
                    </div>
                    <h2
                      className="pixel-text text-lg sm:text-xl mb-3"
                      style={{ color: "var(--color-accent)" }}
                    >
                      MESSAGE SENT!
                    </h2>
                    <p
                      className="mono-text text-sm mb-6"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Thanks for reaching out. I&apos;ll get back to you soon.
                    </p>
                    <button
                      onClick={handleReset}
                      className="pixel-btn"
                    >
                      Send Another
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} noValidate>
                    {/* Name Field */}
                    <div className="mb-5">
                      <label
                        htmlFor="contact-name"
                        className="pixel-text text-[10px] sm:text-xs block mb-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {">"} NAME_
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className="w-full px-4 py-3 mono-text text-sm outline-none transition-all duration-200"
                        style={{
                          background: "var(--color-bg-secondary)",
                          border: `2px solid ${errors.name ? "var(--color-red)" : "var(--color-border)"}`,
                          color: "var(--color-text)",
                          boxShadow: "3px 3px 0 var(--color-border)",
                        }}
                        onFocus={(e) => {
                          if (!errors.name) {
                            e.currentTarget.style.borderColor = "var(--color-accent)";
                            e.currentTarget.style.boxShadow =
                              "0 0 12px var(--color-accent-glow), 3px 3px 0 var(--color-accent-secondary)";
                          }
                        }}
                        onBlur={(e) => {
                          if (!errors.name) {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-border)";
                          }
                        }}
                        placeholder="Enter your name..."
                      />
                      {errors.name && (
                        <p
                          className="pixel-text text-[9px] mt-1"
                          style={{ color: "var(--color-red)" }}
                        >
                          ! {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="mb-5">
                      <label
                        htmlFor="contact-email"
                        className="pixel-text text-[10px] sm:text-xs block mb-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {">"} EMAIL_
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="w-full px-4 py-3 mono-text text-sm outline-none transition-all duration-200"
                        style={{
                          background: "var(--color-bg-secondary)",
                          border: `2px solid ${errors.email ? "var(--color-red)" : "var(--color-border)"}`,
                          color: "var(--color-text)",
                          boxShadow: "3px 3px 0 var(--color-border)",
                        }}
                        onFocus={(e) => {
                          if (!errors.email) {
                            e.currentTarget.style.borderColor = "var(--color-accent)";
                            e.currentTarget.style.boxShadow =
                              "0 0 12px var(--color-accent-glow), 3px 3px 0 var(--color-accent-secondary)";
                          }
                        }}
                        onBlur={(e) => {
                          if (!errors.email) {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-border)";
                          }
                        }}
                        placeholder="you@example.com"
                      />
                      {errors.email && (
                        <p
                          className="pixel-text text-[9px] mt-1"
                          style={{ color: "var(--color-red)" }}
                        >
                          ! {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Message Field */}
                    <div className="mb-6">
                      <label
                        htmlFor="contact-message"
                        className="pixel-text text-[10px] sm:text-xs block mb-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {">"} MESSAGE_
                      </label>
                      <textarea
                        id="contact-message"
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 mono-text text-sm outline-none transition-all duration-200 resize-none"
                        style={{
                          background: "var(--color-bg-secondary)",
                          border: `2px solid ${errors.message ? "var(--color-red)" : "var(--color-border)"}`,
                          color: "var(--color-text)",
                          boxShadow: "3px 3px 0 var(--color-border)",
                        }}
                        onFocus={(e) => {
                          if (!errors.message) {
                            e.currentTarget.style.borderColor = "var(--color-accent)";
                            e.currentTarget.style.boxShadow =
                              "0 0 12px var(--color-accent-glow), 3px 3px 0 var(--color-accent-secondary)";
                          }
                        }}
                        onBlur={(e) => {
                          if (!errors.message) {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-border)";
                          }
                        }}
                        placeholder="Write your message here..."
                      />
                      {errors.message && (
                        <p
                          className="pixel-text text-[9px] mt-1"
                          style={{ color: "var(--color-red)" }}
                        >
                          ! {errors.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={sending}
                      className="pixel-btn w-full"
                      style={{
                        opacity: sending ? 0.7 : 1,
                        cursor: sending ? "wait" : "pointer",
                      }}
                    >
                      {sending ? (
                        <span className="animate-flicker">SENDING...</span>
                      ) : (
                        "TRANSMIT MESSAGE"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Social Links Section */}
        <ScrollReveal delay={200}>
          <div className="mb-16">
            <h2
              className="pixel-text text-base sm:text-lg text-center mb-8"
              style={{ color: "var(--color-text)" }}
            >
              FIND ME ONLINE
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.id === "email" ? undefined : "_blank"}
                  rel={link.id === "email" ? undefined : "noopener noreferrer"}
                  className="pixel-card p-5 text-center block group"
                >
                  <div
                    className="pixel-text text-2xl sm:text-3xl mb-3 transition-transform duration-200 group-hover:scale-110"
                    style={{ color: link.color }}
                  >
                    {link.icon}
                  </div>
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

        {/* Fun Element */}
        <ScrollReveal delay={300}>
          <div className="text-center mb-8">
            {/* Pixel Art Decoration - small envelope sprite */}
            <div className="mb-4 inline-block animate-float">
              <svg
                width="48"
                height="48"
                viewBox="0 0 16 16"
                style={{ imageRendering: "pixelated" }}
              >
                <rect x="2" y="4" width="12" height="9" fill="none" stroke="var(--color-accent)" strokeWidth="1" />
                <line x1="2" y1="4" x2="8" y2="9" stroke="var(--color-accent)" strokeWidth="1" />
                <line x1="14" y1="4" x2="8" y2="9" stroke="var(--color-accent)" strokeWidth="1" />
                <rect x="6" y="1" width="1" height="2" fill="var(--color-accent)" />
                <rect x="9" y="1" width="1" height="2" fill="var(--color-accent)" />
                <rect x="7" y="0" width="2" height="1" fill="var(--color-accent)" />
              </svg>
            </div>
            <p
              className="pixel-text text-[10px] sm:text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {">"} Response time:{" "}
              <span style={{ color: "var(--color-accent)" }}>~24hrs</span>
            </p>
            <p
              className="mono-text text-xs mt-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Usually faster on weekdays
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
