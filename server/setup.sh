#!/usr/bin/env bash
set -Eeuo pipefail

REPO_TAR_URL="https://github.com/agrawal-d/cph/archive/refs/heads/main.tar.gz"
INSTALL_DIR="/opt/cph-feedback"
SERVICE_NAME="feedback-collector.service"
SYSTEMD_PATH="/etc/systemd/system/${SERVICE_NAME}"
HEARTBEAT_SERVICE_NAME="server.service"
HEARTBEAT_SYSTEMD_PATH="/etc/systemd/system/${HEARTBEAT_SERVICE_NAME}"
SERVICE_USER="server"
SERVICE_PORT="8090"
HEARTBEAT_PORT="4546"

MODE=""
READ_PASSWORD=""
TEMP_DIR=""

log() {
    echo "[INFO] $*" >&2
}

error() {
    echo "[ERROR] $*" >&2
}

require_root() {
    if [[ "$(id -u)" -ne 0 ]]; then
        error "This script must be run as root."
        exit 1
    fi
}

cleanup_temp() {
    if [[ -n "${TEMP_DIR}" && -d "${TEMP_DIR}" ]]; then
        rm -rf "${TEMP_DIR}"
    fi
}

trap cleanup_temp EXIT

usage() {
    echo "Usage: $0 <--install|--uninstall> [--read-password=<password>] [--port=<port>] [--heartbeat-port=<port>]"
    echo ""
    echo "Options:"
    echo "  --install                  Install and start feedback collector & heartbeat services"
    echo "  --uninstall                Stop, disable and remove feedback collector & heartbeat services"
    echo "  --read-password=<password> Required when installing. Access password for viewer and API"
    echo "  --port=<port>              Optional HTTP port for feedback collector [default: 8090]"
    echo "  --heartbeat-port=<port>    Optional HTTP port for heartbeat server [default: 4546]"
    echo "  --help, -h                 Show this help message"
    exit 0
}

parse_arguments() {
    if [[ $# -eq 0 ]]; then
        usage
    fi

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --install)
                MODE="install"
                shift
                ;;
            --uninstall)
                MODE="uninstall"
                shift
                ;;
            --read-password=*)
                READ_PASSWORD="${1#*=}"
                shift
                ;;
            --read-password)
                if [[ -n "${2:-}" && ! "$2" =~ ^-- ]]; then
                    READ_PASSWORD="$2"
                    shift 2
                else
                    error "--read-password requires an argument"
                    exit 1
                fi
                ;;
            --port=*)
                SERVICE_PORT="${1#*=}"
                shift
                ;;
            --port)
                if [[ -n "${2:-}" && ! "$2" =~ ^-- ]]; then
                    SERVICE_PORT="$2"
                    shift 2
                else
                    error "--port requires an argument"
                    exit 1
                fi
                ;;
            --heartbeat-port=*)
                HEARTBEAT_PORT="${1#*=}"
                shift
                ;;
            --heartbeat-port)
                if [[ -n "${2:-}" && ! "$2" =~ ^-- ]]; then
                    HEARTBEAT_PORT="$2"
                    shift 2
                else
                    error "--heartbeat-port requires an argument"
                    exit 1
                fi
                ;;
            --help|-h)
                usage
                ;;
            *)
                error "Unknown argument: $1"
                usage
                ;;
        esac
    done

    if [[ -z "${MODE}" ]]; then
        error "Must specify either --install or --uninstall."
        exit 1
    fi

    if [[ "${MODE}" == "install" && -z "${READ_PASSWORD}" ]]; then
        error "--read-password is required when installing."
        exit 1
    fi
}

check_dependencies() {
    local missing=()
    for cmd in curl tar node systemctl; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing+=("$cmd")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
}

ensure_service_user() {
    if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
        log "Creating system user ${SERVICE_USER}..."
        useradd --system --no-create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
    fi
}

download_and_extract() {
    TEMP_DIR="$(mktemp -d /tmp/cph-setup.XXXXXX)"
    log "Downloading repository archive..."
    curl -fsSL "${REPO_TAR_URL}" -o "${TEMP_DIR}/repo.tar.gz"

    log "Extracting repository files..."
    tar -xzf "${TEMP_DIR}/repo.tar.gz" -C "${TEMP_DIR}"

    local server_dir
    server_dir="$(find "${TEMP_DIR}" -type d -name "server" | head -n 1)"
    if [[ -z "${server_dir}" || ! -f "${server_dir}/feedback-collector.js" ]]; then
        error "Archive does not contain server directory."
        exit 1
    fi

    echo "${server_dir}"
}

rollback_install() {
    error "Installation failed. Rolling back changes..."
    systemctl stop "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}" 2>/dev/null || true
    systemctl disable "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}" 2>/dev/null || true
    rm -f "${SYSTEMD_PATH}" "${HEARTBEAT_SYSTEMD_PATH}"
    systemctl daemon-reload 2>/dev/null || true
    if [[ -d "${INSTALL_DIR}" ]]; then
        rm -rf "${INSTALL_DIR}"
    fi
    exit 1
}

deploy_files() {
    local source_dir="$1"
    mkdir -p "${INSTALL_DIR}"

    cp "${source_dir}/feedback-collector.js" "${INSTALL_DIR}/feedback-collector.js"
    cp "${source_dir}/feedback-viewer.html" "${INSTALL_DIR}/feedback-viewer.html"
    cp "${source_dir}/server.js" "${INSTALL_DIR}/server.js"

    chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}"
    chmod 750 "${INSTALL_DIR}"
    chmod 640 "${INSTALL_DIR}/feedback-collector.js"
    chmod 640 "${INSTALL_DIR}/feedback-viewer.html"
    chmod 640 "${INSTALL_DIR}/server.js"
}

create_systemd_services() {
    cat <<EOF > "${SYSTEMD_PATH}"
[Unit]
Description=CPH Feedback Collector Service
After=network.target

[Service]
ExecStart=/usr/bin/env node ${INSTALL_DIR}/feedback-collector.js
Restart=always
RestartSec=5
Environment=PORT=${SERVICE_PORT}
Environment=READ_PASSWORD=${READ_PASSWORD}
Environment=FEEDBACK_FILE=${INSTALL_DIR}/feedback.csv
Environment=VIEWER_FILE=${INSTALL_DIR}/feedback-viewer.html
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}

[Install]
WantedBy=multi-user.target
EOF

    cat <<EOF > "${HEARTBEAT_SYSTEMD_PATH}"
[Unit]
Description=Node.js heartbeat server
After=network.target

[Service]
ExecStart=/usr/bin/env node ${INSTALL_DIR}/server.js
Restart=always
RestartSec=5
Environment=PORT=${HEARTBEAT_PORT}
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}

[Install]
WantedBy=multi-user.target
EOF

    chmod 644 "${SYSTEMD_PATH}" "${HEARTBEAT_SYSTEMD_PATH}"
}

start_and_validate_services() {
    log "Reloading systemd daemon..."
    systemctl daemon-reload

    log "Enabling and starting services..."
    systemctl enable "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}"
    systemctl restart "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}"

    log "Validating services status..."
    local attempts=10
    local all_running=false
    for ((i=1; i<=attempts; i++)); do
        if systemctl is-active --quiet "${SERVICE_NAME}" && systemctl is-active --quiet "${HEARTBEAT_SERVICE_NAME}"; then
            all_running=true
            break
        fi
        sleep 1
    done

    if [[ "${all_running}" != "true" ]]; then
        error "One or more services failed to start properly."
        systemctl status "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}" --no-pager || true
        journalctl -u "${SERVICE_NAME}" -u "${HEARTBEAT_SERVICE_NAME}" -n 20 --no-pager || true
        rollback_install
    fi
}

run_install() {
    check_dependencies
    ensure_service_user

    local source_dir
    source_dir="$(download_and_extract)"

    deploy_files "${source_dir}"
    create_systemd_services
    start_and_validate_services

    log "Installation completed successfully."
    log "Service '${SERVICE_NAME}' is active and running on port ${SERVICE_PORT}."
    log "Service '${HEARTBEAT_SERVICE_NAME}' is active and running on port ${HEARTBEAT_PORT}."
    log "Access viewer at: http://<server-ip>:${SERVICE_PORT}/feedback-viewer.html"
}

run_uninstall() {
    log "Stopping services..."
    systemctl stop "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}" 2>/dev/null || true

    log "Disabling services..."
    systemctl disable "${SERVICE_NAME}" "${HEARTBEAT_SERVICE_NAME}" 2>/dev/null || true

    rm -f "${SYSTEMD_PATH}" "${HEARTBEAT_SYSTEMD_PATH}"
    systemctl daemon-reload
    log "Removed systemd service units."

    if [[ -d "${INSTALL_DIR}" ]]; then
        if [[ -f "${INSTALL_DIR}/feedback.csv" ]]; then
            log "Preserving existing feedback data at ${INSTALL_DIR}/feedback.csv"
            rm -f "${INSTALL_DIR}/feedback-collector.js" "${INSTALL_DIR}/feedback-viewer.html" "${INSTALL_DIR}/server.js"
        else
            rm -rf "${INSTALL_DIR}"
        fi
        log "Cleaned up installation directory ${INSTALL_DIR}."
    fi

    log "Uninstallation completed successfully."
}

main() {
    parse_arguments "$@"
    require_root

    if [[ "${MODE}" == "install" ]]; then
        run_install
    elif [[ "${MODE}" == "uninstall" ]]; then
        run_uninstall
    fi
}

main "$@"
