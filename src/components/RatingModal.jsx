import React, { useState } from "react";
import { X, Star, Heart, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";
import { saveRating } from "../data/dataSource";

const RatingModal = ({ isOpen, onClose, currentCustomer, settings }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      Swal.fire({ title: "Calificación faltante", text: "Por favor selecciona al menos una estrella.", icon: "warning", confirmButtonColor: "#ffcc00", customClass: { popup: "saborio-swal-dark" } });
      return;
    }

    setIsSubmitting(true);
    await saveRating(currentCustomer?.telefono, rating, comment);
    
    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setComment("");
      onClose();
    }, 3000);
  };

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div className="customer-modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: "2rem", textAlign: "center" }}>
        <button type="button" className="customer-modal-close-btn" onClick={onClose}><X size={18} /></button>
        
        {submitted ? (
          <div style={{ padding: "2rem 1rem" }}>
            <CheckCircle2 size={64} color="#10b981" style={{ margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>¡Gracias por tu opinión!</h3>
            <p style={{ color: "#aaa" }}>Tu retroalimentación nos ayuda a seguir mejorando.</p>
          </div>
        ) : (
          <>
            <Heart size={48} color="#ff4757" fill="rgba(255, 71, 87, 0.2)" style={{ margin: "0 auto 1rem" }} />
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>¿Cómo calificarías a {settings?.razonSocial || "nuestro negocio"}?</h2>
            <p style={{ color: "#aaa", marginBottom: "1.5rem" }}>
              {currentCustomer?.nombre ? `¡Hola ${currentCustomer.nombre}! ` : ""}
              Tu opinión es muy importante para nosotros.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "1.5rem" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={40}
                      fill={star <= (hoverRating || rating) ? "#ffcc00" : "transparent"}
                      color={star <= (hoverRating || rating) ? "#ffcc00" : "#555"}
                      style={{ transition: "all 0.2s" }}
                    />
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "1.5rem", textAlign: "left" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc", fontSize: "0.9rem" }}>Cuéntanos más (opcional)</label>
                <textarea 
                  rows={3} 
                  style={{ width: "100%", padding: "0.8rem", borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#fff", outline: "none" }}
                  placeholder="¿Qué te gustó más? ¿Qué podríamos mejorar?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <button type="submit" className="customer-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Calificación"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default RatingModal;
