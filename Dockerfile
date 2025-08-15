# --- Favicon build stage ---
FROM pnatel/nextcloud-imagemagick-ffmpeg:prod AS favicon-builder
WORKDIR /app
COPY assets/logo.png ./
RUN ffmpeg -i logo.png -vf "crop=iw*0.8:ih*0.8" crop.png
RUN W=$(identify -format "%w" crop.png); \
    H=$(identify -format "%h" crop.png); \
    R=$((W / 4)); \
    convert crop.png -alpha \
      on \( -size ${W}x${H} xc:none -draw "roundrectangle 0,0,$((W-1)),$((H-1)),$R,$R" \) \
      -compose DstIn -composite rounded.png
RUN ffmpeg -i rounded.png -vf "scale=128:128:flags=lanczos" favicon.ico

# Use official Node.js LTS image
FROM node:24-alpine AS runtime
ENV NODE_ENV=production

# Create and use a non-root user
RUN addgroup -S mypgroup && adduser -S mypapp -G mypgroup
USER mypapp

# Copy project files with minimal permissions
COPY --from=favicon-builder --chown=mypapp:mypgroup /app/favicon.ico /server/public/favicon.ico
COPY --chown=mypapp:mypgroup index.html /server/
COPY --chown=mypapp:mypgroup robots.txt /server/
COPY --chown=mypapp:mypgroup public/ /server/public/
COPY --chown=mypapp:mypgroup src/ /server/src/

# Set permissions recursively for all files and directories
RUN chmod -R 555 /server && chmod 444 /server/index.html && chmod 444 /server/public/*

# Expose port
EXPOSE 80

# Healthcheck to ensure the server is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["node", "/server/src/server.js"]
