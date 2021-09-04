import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { ImageStage, PageContainer, CreatePortal } from './components';

/**
 * Gesture controlled lightbox that interpolates animations with spring physics.
 *
 * @param {boolean} isOpen Flag that dictates if the lightbox is open or closed
 * @param {function} onClose Function that closes the Lightbox
 * @param {function} onPrev Function that changes currentIndex to previous image in images
 * @param {function} onNext Function that changes currentIndex to next image in images
 * @param {number} currentIndex Index of image in images array that is currently shown
 * @param {function} renderHeader A React component that renders above the image pager
 * @param {function} renderFooter A React component that renders below the image pager
 * @param {function} renderImageOverlay A React component that renders inside the image stage, useful for making overlays over the image
 * @param {function} renderPrevButton A React component that is used for previous button in image pager
 * @param {function} renderNextButton A React component that is used for next button in image pager
 * @param {array} images Array of image objects to be shown in Lightbox
 * @param {string} className Classes are applied to the root lightbox component
 * @param {object} style Inline styles are applied to the root lightbox component
 * @param {object} pageTransitionConfig React-Spring useTransition config for page open/close animation
 * @param {boolean} singleClickToZoom Overrides the default behavior of double clicking causing an image zoom to a single click
 *
 * @see https://github.com/react-spring/react-use-gesture
 * @see https://github.com/react-spring/react-spring
 */
const Lightbox = ({
    isOpen,
    onClose,
    images,
    currentIndex,
    onPrev,
    onNext,
    renderHeader,
    renderFooter,
    renderPrevButton,
    renderNextButton,
    renderImageOverlay,
    renderCustomComponent,
    renderCustomSidebar,
    className,
    singleClickToZoom,
    style,
    pageTransitionConfig
}) => {
    // Handle event listeners for keyboard
    useEffect(() => {
        /**
         * Prevent keyboard from controlling background page
         * when lightbox is open
         */
        const preventBackgroundScroll = e => {
            const keysToIgnore = [
                'ArrowUp',
                'ArrowDown',
                'End',
                'Home',
                'PageUp',
                'PageDown'
            ];

            if (isOpen && keysToIgnore.includes(e.key)) e.preventDefault();
        };

        /**
         * Navigate images with arrow keys, close on Esc key
         */
        const handleKeyboardInput = e => {
            if (isOpen) {
                switch (e.key) {
                    case 'ArrowLeft':
                        onPrev();
                        break;
                    case 'ArrowRight':
                        onNext();
                        break;
                    default:
                        e.preventDefault();
                        break;
                }
            }
        };

        document.addEventListener('keyup', handleKeyboardInput);
        document.addEventListener('keydown', preventBackgroundScroll);

        return () => {
            document.removeEventListener('keyup', handleKeyboardInput);
            document.removeEventListener('keydown', preventBackgroundScroll);
        };
    });

    return (
        <CreatePortal>
            <PageContainer
                isOpen={isOpen}
                className={className}
                style={style}
                pageTransitionConfig={pageTransitionConfig}
            >
                {renderHeader()}
                <div className="view-container">
                    <ViewContainer>
                        <ImageStage
                            images={images}
                            onClose={onClose}
                            currentIndex={currentIndex}
                            onPrev={onPrev}
                            onNext={onNext}
                            renderPrevButton={renderPrevButton}
                            renderNextButton={renderNextButton}
                            renderImageOverlay={renderImageOverlay}
                            renderCustomComponent={renderCustomComponent}
                            singleClickToZoom={singleClickToZoom}
                        />
                        {renderFooter()}
                    </ViewContainer>
                    {renderCustomSidebar()}
                </div>
            </PageContainer>
        </CreatePortal>
    );
};

Lightbox.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onPrev: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    currentIndex: PropTypes.number.isRequired,
    images: PropTypes.arrayOf(
        PropTypes.shape({
            src: PropTypes.string.isRequired,
            caption: PropTypes.string.isRequired,
            alt: PropTypes.string.isRequired,
            width: PropTypes.number,
            height: PropTypes.number
        })
    ).isRequired,
    renderHeader: PropTypes.func,
    renderFooter: PropTypes.func,
    renderPrevButton: PropTypes.func,
    renderNextButton: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    pageTransitionConfig: PropTypes.object,
    renderImageOverlay: PropTypes.func,
    renderCustomComponent: PropTypes.func,
    renderCustomSidebar: PropTypes.func,
    singleClickToZoom: PropTypes.bool
};

Lightbox.defaultProps = {
    pageTransitionConfig: null,
    className: null,
    style: null,
    renderHeader: () => null,
    renderFooter: () => null,
    renderPrevButton: () => null,
    renderNextButton: () => null,
    renderImageOverlay: () => null,
    renderCustomComponent: () => null,
    renderCustomSidebar: () => null,
    singleClickToZoom: false
};

const ViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 400;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
`;

export default Lightbox;
